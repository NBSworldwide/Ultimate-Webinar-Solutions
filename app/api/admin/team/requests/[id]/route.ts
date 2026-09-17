import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser, hasCapability } from "@/lib/auth";
import { assertSameOrigin, RequestSecurityError } from "@/lib/request-security";
import { reviewManagerPromotion, TeamAccountError } from "@/lib/team";

const decisionSchema = z.object({
  decision: z.enum(["approve", "deny"]),
  reviewNote: z.string().trim().max(1000).optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || !hasCapability(user, "team.approve")) {
    return NextResponse.json({ error: user ? "Only the Administrator of Record can review promotion requests." : "Sign in as an administrator." }, { status: user ? 403 : 401 });
  }
  try {
    assertSameOrigin(request);
    const body = decisionSchema.parse(await request.json());
    const reviewed = await reviewManagerPromotion((await params).id, body.decision, user.id, body.reviewNote ?? "");
    revalidatePath("/admin/team");
    return NextResponse.json({ request: reviewed });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Choose approve or deny and optionally add a note up to 1,000 characters." }, { status: 400 });
    if (error instanceof TeamAccountError) return NextResponse.json({ error: error.message }, { status: error.statusCode });
    if (error instanceof RequestSecurityError) return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: "The promotion decision could not be saved." }, { status: 500 });
  }
}
