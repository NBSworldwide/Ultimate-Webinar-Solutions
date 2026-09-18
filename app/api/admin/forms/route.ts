import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { hasCapability } from "@/lib/authorization";
import { createForm, getForms, type FormInput } from "@/lib/forms";
import { DomainError } from "@/lib/errors";
import { assertSameOrigin, RequestSecurityError } from "@/lib/request-security";
import type { FormStatus } from "@/lib/types";

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

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || !hasCapability(user, "forms.manage")) return NextResponse.json({ error: user ? "You do not have permission for this area." : "Sign in to continue." }, { status: user ? 403 : 401 });
  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const filters = status && ["draft", "published", "archived"].includes(status) ? status as FormStatus : "all";
  return NextResponse.json({ forms: await getForms({ query: url.searchParams.get("q") ?? "", status: filters }) });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || !hasCapability(user, "forms.manage")) return NextResponse.json({ error: user ? "You do not have permission for this area." : "Sign in to continue." }, { status: user ? 403 : 401 });
  try {
    assertSameOrigin(request);
    const form = await createForm(formSchema.parse(await request.json()) as FormInput, user.id);
    revalidatePath("/admin/forms");
    revalidatePath(`/forms/${form.slug}`);
    return NextResponse.json({ form: { id: form.id, slug: form.slug } }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Complete the form name and builder fields." }, { status: 400 });
    if (error instanceof DomainError) return NextResponse.json({ error: error.message }, { status: error.statusCode });
    if (error instanceof RequestSecurityError) return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: "The form could not be created." }, { status: 500 });
  }
}
