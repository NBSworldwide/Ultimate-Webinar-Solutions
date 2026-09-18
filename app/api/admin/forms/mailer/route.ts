import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { hasCapability } from "@/lib/authorization";
import { getFormMailerSettings, testFormMailer, updateFormMailerSettings, type FormMailerInput } from "@/lib/forms";
import { DomainError } from "@/lib/errors";
import { assertSameOrigin, RequestSecurityError } from "@/lib/request-security";

const provider = z.enum(["native", "smtp", "brevo", "mailjet", "sendgrid", "gmail", "resend", "mailgun", "ses", "postmark"]);
const mailerSchema = z.object({
  primaryProvider: provider,
  backupProvider: provider.nullable(),
  fromName: z.string().max(160),
  fromEmail: z.string().max(254),
  forceFrom: z.boolean(),
  settings: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).default({}),
  secrets: z.record(z.string(), z.string().max(20_000)).default({}),
  clearSecrets: z.array(z.string().max(80)).max(30).default([]),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !hasCapability(user, "forms.manage")) return NextResponse.json({ error: user ? "You do not have permission for this area." : "Sign in to continue." }, { status: user ? 403 : 401 });
  return NextResponse.json({ mailer: await getFormMailerSettings() });
}

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user || !hasCapability(user, "forms.manage")) return NextResponse.json({ error: user ? "You do not have permission for this area." : "Sign in to continue." }, { status: user ? 403 : 401 });
  try {
    assertSameOrigin(request);
    const mailer = await updateFormMailerSettings(mailerSchema.parse(await request.json()) as FormMailerInput, user.id);
    revalidatePath("/admin/forms");
    return NextResponse.json({ mailer });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Check the mailer settings and try again." }, { status: 400 });
    if (error instanceof DomainError) return NextResponse.json({ error: error.message }, { status: error.statusCode });
    if (error instanceof RequestSecurityError) return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: "The mailer settings could not be saved." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || !hasCapability(user, "forms.manage")) return NextResponse.json({ error: user ? "You do not have permission for this area." : "Sign in to continue." }, { status: user ? 403 : 401 });
  try {
    assertSameOrigin(request);
    const result = await testFormMailer(user.id);
    return NextResponse.json({ result });
  } catch (error) {
    if (error instanceof DomainError) return NextResponse.json({ error: error.message }, { status: error.statusCode });
    if (error instanceof RequestSecurityError) return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: "The mailer test could not be recorded." }, { status: 500 });
  }
}
