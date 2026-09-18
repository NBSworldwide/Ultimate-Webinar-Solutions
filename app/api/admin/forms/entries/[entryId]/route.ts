import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { hasCapability } from "@/lib/authorization";
import { deleteFormEntry, resendFormNotifications, restoreFormEntry, trashFormEntry, updateFormEntry } from "@/lib/forms";
import { DomainError } from "@/lib/errors";
import { assertSameOrigin, RequestSecurityError } from "@/lib/request-security";

const updateSchema = z.object({
  isRead: z.boolean().optional(),
  isStarred: z.boolean().optional(),
  isSpam: z.boolean().optional(),
  notes: z.string().max(10_000).optional(),
  paymentStatus: z.enum(["none", "pending", "paid", "refunded"]).optional(),
});
const actionSchema = z.object({ action: z.enum(["trash", "restore", "resend"]) });

function responseError(error: unknown, fallback: string): NextResponse {
  if (error instanceof z.ZodError) return NextResponse.json({ error: "Check the entry action and try again." }, { status: 400 });
  if (error instanceof DomainError) return NextResponse.json({ error: error.message }, { status: error.statusCode });
  if (error instanceof RequestSecurityError) return NextResponse.json({ error: error.message }, { status: 403 });
  return NextResponse.json({ error: fallback }, { status: 500 });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ entryId: string }> }) {
  const user = await getCurrentUser();
  if (!user || !hasCapability(user, "forms.manage")) return NextResponse.json({ error: user ? "You do not have permission for this area." : "Sign in to continue." }, { status: user ? 403 : 401 });
  try {
    assertSameOrigin(request);
    await updateFormEntry((await params).entryId, updateSchema.parse(await request.json()), user.id);
    revalidatePath("/admin/forms", "layout");
    return NextResponse.json({ updated: true });
  } catch (error) {
    return responseError(error, "The entry could not be updated.");
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ entryId: string }> }) {
  const user = await getCurrentUser();
  if (!user || !hasCapability(user, "forms.manage")) return NextResponse.json({ error: user ? "You do not have permission for this area." : "Sign in to continue." }, { status: user ? 403 : 401 });
  try {
    assertSameOrigin(request);
    const { entryId } = await params;
    const { action } = actionSchema.parse(await request.json());
    if (action === "trash") await trashFormEntry(entryId, user.id);
    if (action === "restore") await restoreFormEntry(entryId, user.id);
    if (action === "resend") return NextResponse.json({ result: await resendFormNotifications(entryId, user.id) });
    revalidatePath("/admin/forms", "layout");
    return NextResponse.json({ updated: true });
  } catch (error) {
    return responseError(error, "The entry action could not be completed.");
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ entryId: string }> }) {
  const user = await getCurrentUser();
  if (!user || !hasCapability(user, "forms.manage")) return NextResponse.json({ error: user ? "You do not have permission for this area." : "Sign in to continue." }, { status: user ? 403 : 401 });
  try {
    assertSameOrigin(request);
    await deleteFormEntry((await params).entryId, user.id);
    revalidatePath("/admin/forms", "layout");
    return NextResponse.json({ deleted: true });
  } catch (error) {
    return responseError(error, "The entry could not be permanently deleted.");
  }
}
