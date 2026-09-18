import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { hasCapability } from "@/lib/authorization";
import { archiveForm, getFormById, updateForm, type FormInput } from "@/lib/forms";
import { DomainError } from "@/lib/errors";
import { assertSameOrigin, RequestSecurityError } from "@/lib/request-security";

const formSchema = z.object({
  name: z.string().trim().min(2).max(140),
  slug: z.string().trim().max(100).default(""),
  description: z.string().trim().max(2_000).default(""),
  tags: z.array(z.string().max(40)).max(20).default([]),
  status: z.enum(["draft", "published", "archived"]),
  submitButtonText: z.string().trim().max(80).default("Submit"),
  submittingText: z.string().trim().max(80).default("Sending…"),
  settings: z.unknown().optional(),
  fields: z.array(z.unknown()).max(100).default([]),
  notifications: z.array(z.unknown()).max(20).default([]),
  confirmation: z.unknown().optional(),
});

function revalidateForm(slugs: string[]): void {
  revalidatePath("/admin/forms");
  for (const slug of slugs.filter(Boolean)) revalidatePath(`/forms/${slug}`);
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || !hasCapability(user, "forms.manage")) return NextResponse.json({ error: user ? "You do not have permission for this area." : "Sign in to continue." }, { status: user ? 403 : 401 });
  const form = await getFormById((await params).id);
  return form ? NextResponse.json({ form }) : NextResponse.json({ error: "Form not found." }, { status: 404 });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || !hasCapability(user, "forms.manage")) return NextResponse.json({ error: user ? "You do not have permission for this area." : "Sign in to continue." }, { status: user ? 403 : 401 });
  try {
    assertSameOrigin(request);
    const id = (await params).id;
    const previous = await getFormById(id);
    if (!previous) return NextResponse.json({ error: "Form not found." }, { status: 404 });
    const form = await updateForm(id, formSchema.parse(await request.json()) as FormInput, user.id);
    revalidateForm([previous.slug, form.slug]);
    return NextResponse.json({ form });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Complete the form name and builder fields." }, { status: 400 });
    if (error instanceof DomainError) return NextResponse.json({ error: error.message }, { status: error.statusCode });
    if (error instanceof RequestSecurityError) return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: "The form could not be updated." }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || !hasCapability(user, "forms.manage")) return NextResponse.json({ error: user ? "You do not have permission for this area." : "Sign in to continue." }, { status: user ? 403 : 401 });
  try {
    assertSameOrigin(request);
    const id = (await params).id;
    const form = await getFormById(id);
    if (!form) return NextResponse.json({ error: "Form not found." }, { status: 404 });
    await archiveForm(id, user.id);
    revalidateForm([form.slug]);
    return NextResponse.json({ archived: true });
  } catch (error) {
    if (error instanceof DomainError) return NextResponse.json({ error: error.message }, { status: error.statusCode });
    if (error instanceof RequestSecurityError) return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: "The form could not be archived." }, { status: 500 });
  }
}
