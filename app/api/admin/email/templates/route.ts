import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { hasCapability } from "@/lib/authorization";
import { createEmailTemplate, DomainError } from "@/lib/email";
import { assertSameOrigin, RequestSecurityError } from "@/lib/request-security";

const templateSchema = z.object({
  name: z.string().trim().min(2).max(140),
  slug: z.string().trim().max(80).optional(),
  triggerKey: z.string().trim().min(2).max(100),
  messageType: z.enum(["transactional", "marketing"]),
  subject: z.string().trim().min(2).max(200),
  preheader: z.string().trim().max(240).default(""),
  htmlBody: z.string().trim().min(2).max(100000),
  textBody: z.string().trim().min(2).max(50000),
  status: z.enum(["draft", "active", "archived"]).default("draft"),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !hasCapability(user, "email.manage")) return NextResponse.json({ error: user ? "You do not have permission for this area." : "Sign in to continue." }, { status: user ? 403 : 401 });
  const { getEmailTemplates } = await import("@/lib/email");
  return NextResponse.json({ templates: await getEmailTemplates() });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || !hasCapability(user, "email.manage")) return NextResponse.json({ error: user ? "You do not have permission for this area." : "Sign in to continue." }, { status: user ? 403 : 401 });
  try {
    assertSameOrigin(request);
    const template = await createEmailTemplate(templateSchema.parse(await request.json()), user.id);
    revalidatePath("/admin/email");
    return NextResponse.json({ template: { id: template.id, slug: template.slug } }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Complete the email template fields." }, { status: 400 });
    if (error instanceof DomainError) return NextResponse.json({ error: error.message }, { status: error.statusCode });
    if (error instanceof RequestSecurityError) return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: "The email template could not be created." }, { status: 500 });
  }
}
