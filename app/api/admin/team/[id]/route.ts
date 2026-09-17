import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser, hasCapability } from "@/lib/auth";
import { assertSameOrigin, RequestSecurityError } from "@/lib/request-security";
import { requestManagerPromotion, TeamAccountError, updateTeamUserRole } from "@/lib/team";

const roleSchema = z.object({ role: z.enum(["admin", "manager", "attendee"]) });

function deny(user: Awaited<ReturnType<typeof getCurrentUser>>): NextResponse {
  return NextResponse.json(
    { error: user ? "Team access is required for this action." : "Sign in to continue." },
    { status: user ? 403 : 401 },
  );
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || !hasCapability(user, "team.view")) return deny(user);
  try {
    assertSameOrigin(request);
    const targetId = (await params).id;
    const role = roleSchema.parse(await request.json()).role;
    if (role === "manager") {
      if (!hasCapability(user, "team.promote")) return NextResponse.json({ error: "You are not allowed to request manager promotions." }, { status: 403 });
      const promotionRequest = await requestManagerPromotion(targetId, user.id);
      revalidatePath("/admin/team");
      return NextResponse.json({ request: promotionRequest, message: "Promotion request sent to the Administrator of Record." }, { status: 202 });
    }
    if (!hasCapability(user, "team.manage")) return NextResponse.json({ error: "Only administrators can make direct role changes." }, { status: 403 });
    const updated = await updateTeamUserRole(targetId, role, user.id);
    revalidatePath("/admin/team");
    return NextResponse.json({ user: updated });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Choose a valid account role." }, { status: 400 });
    if (error instanceof TeamAccountError) return NextResponse.json({ error: error.message }, { status: error.statusCode });
    if (error instanceof RequestSecurityError) return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: "The account role could not be updated." }, { status: 500 });
  }
}
