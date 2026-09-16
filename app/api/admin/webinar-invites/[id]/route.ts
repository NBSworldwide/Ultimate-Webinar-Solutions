import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { revokeWebinarInvite, DomainError } from "@/lib/data";
import { assertSameOrigin, RequestSecurityError } from "@/lib/request-security";
import { clientKey, enforceRateLimit, RateLimitError } from "@/lib/rate-limit";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Admin access is required." }, { status: 401 });

  try {
    assertSameOrigin(request);
    await enforceRateLimit("private-invite-revoke", clientKey(request), 30, 10 * 60_000);
    await revokeWebinarInvite((await params).id, user.id);
    revalidatePath("/admin/private-webinars");
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof DomainError) return NextResponse.json({ error: error.message }, { status: error.statusCode });
    if (error instanceof RequestSecurityError) return NextResponse.json({ error: error.message }, { status: 403 });
    if (error instanceof RateLimitError) return NextResponse.json({ error: error.message }, { status: 429, headers: { "Retry-After": String(error.retryAfterSeconds) } });
    return NextResponse.json({ error: "The invitation could not be revoked." }, { status: 500 });
  }
}
