import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getCurrentUser, hasCapability } from "@/lib/auth";
import { requestAdminPasswordReset } from "@/lib/account-security";
import { DomainError } from "@/lib/errors";
import { assertSameOrigin, RequestSecurityError } from "@/lib/request-security";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || !hasCapability(user, "team.manage")) return NextResponse.json({ error: user ? "Only administrators can send account reset links." : "Sign in as an administrator." }, { status: user ? 403 : 401 });
  try {
    assertSameOrigin(request);
    await requestAdminPasswordReset((await params).id, user.id);
    revalidatePath("/admin/team");
    return NextResponse.json({ message: "A password-reset link was queued for that account." }, { status: 202 });
  } catch (error) {
    if (error instanceof DomainError) return NextResponse.json({ error: error.message }, { status: error.statusCode });
    if (error instanceof RequestSecurityError) return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: "The account reset link could not be created." }, { status: 500 });
  }
}
