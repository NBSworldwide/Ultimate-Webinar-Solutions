import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { assertStandaloneDataset, getDb } from "@/lib/db";

export const runtime = "nodejs";

function isValidTwilioSignature(request: Request, fields: Record<string, string>): boolean {
  const token = process.env.TWILIO_AUTH_TOKEN;
  const signature = request.headers.get("x-twilio-signature");
  if (!token || !signature) return false;
  const callbackUrl = process.env.TWILIO_STATUS_CALLBACK_URL ?? request.url;
  const signedPayload = callbackUrl + Object.keys(fields).sort().map((key) => `${key}${fields[key]}`).join("");
  const expected = createHmac("sha1", token).update(signedPayload).digest("base64");
  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);
  return expectedBuffer.length === signatureBuffer.length && timingSafeEqual(expectedBuffer, signatureBuffer);
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const fields = Object.fromEntries([...form.entries()].map(([key, value]) => [key, typeof value === "string" ? value : value.name]));
    if (!isValidTwilioSignature(request, fields)) return NextResponse.json({ error: "Invalid webhook signature." }, { status: 403 });
    await assertStandaloneDataset();
    const providerMessageId = fields.MessageSid ?? "";
    const providerStatus = fields.MessageStatus ?? "unknown";
    const errorCode = fields.ErrorCode || null;
    if (providerMessageId) {
      const outbox = await getDb().query<{ id: string }>("SELECT id FROM sms_outbox WHERE provider_message_id = $1", [providerMessageId]);
      if (outbox.rows[0]) {
        const terminalFailure = providerStatus === "failed" || providerStatus === "undelivered";
        if (terminalFailure) {
          await getDb().query("UPDATE sms_outbox SET status = 'failed', last_error = $2 WHERE id = $1", [outbox.rows[0].id, errorCode ? `Twilio error ${errorCode}` : `Twilio status ${providerStatus}`]);
        } else if (providerStatus === "delivered" || providerStatus === "sent") {
          await getDb().query("UPDATE sms_outbox SET status = 'sent', sent_at = COALESCE(sent_at, $2), last_error = NULL WHERE id = $1", [outbox.rows[0].id, new Date().toISOString()]);
        }
        await getDb().query("INSERT INTO sms_delivery_events (id, outbox_id, provider_message_id, provider_status, provider_error_code, received_at, payload_json) VALUES ($1, $2, $3, $4, $5, $6, $7)", [randomUUID(), outbox.rows[0].id, providerMessageId, providerStatus, errorCode, new Date().toISOString(), JSON.stringify(fields)]);
      }
    }
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
