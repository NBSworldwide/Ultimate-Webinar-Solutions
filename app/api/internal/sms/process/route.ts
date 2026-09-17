import { NextResponse } from "next/server";
import { processDueSms } from "@/lib/sms";

export const runtime = "nodejs";

async function processRequest(request: Request) {
  const expected = [process.env.SMS_WORKER_SECRET, process.env.CRON_SECRET].filter((value): value is string => Boolean(value));
  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? request.headers.get("x-sms-worker-secret");
  if (expected.length === 0 || !provided || !expected.includes(provided)) return NextResponse.json({ error: "Worker authorization is required." }, { status: 401 });
  try {
    return NextResponse.json(await processDueSms(20));
  } catch {
    return NextResponse.json({ error: "SMS processing failed." }, { status: 500 });
  }
}

export const GET = processRequest;
export const POST = processRequest;
