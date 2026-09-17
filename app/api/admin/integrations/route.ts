import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { DomainError } from "@/lib/errors";
import { updateIntegrationSettings } from "@/lib/integrations";
import { assertSameOrigin, RequestSecurityError } from "@/lib/request-security";

const valuesSchema = z.record(z.string(), z.string().trim().max(500));
const schema = z.object({
  streamingProvider: z.enum(["cloudflare_stream", "mux", "amazon_ivs"]).nullable(),
  emailProvider: z.enum(["resend", "postmark", "sendgrid"]).nullable(),
  streamingValues: valuesSchema,
  emailValues: valuesSchema,
});

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Admin access is required." }, { status: 401 });
  try {
    assertSameOrigin(request);
    const settings = await updateIntegrationSettings(schema.parse(await request.json()), user.id);
    revalidatePath("/admin/settings");
    return NextResponse.json({ settings: { ...settings, streamingValues: settings.streamingValues, emailValues: settings.emailValues } });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Choose valid providers and complete their fields." }, { status: 400 });
    if (error instanceof DomainError) return NextResponse.json({ error: error.message }, { status: error.statusCode });
    if (error instanceof RequestSecurityError) return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: "The integration settings could not be saved." }, { status: 500 });
  }
}
