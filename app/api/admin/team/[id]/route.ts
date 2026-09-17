import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser, hasCapability } from "@/lib/auth";
import { assertSameOrigin, RequestSecurityError } from "@/lib/request-security";
import { TeamAccountError, updateTeamUserRole } from "@/lib/team";

const roleSchema = z.object({ role: z.enum(["admin", "manager", "attendee"]) });

function deny(user: Awaited<ReturnType<typeof getCurrentUser>>): NextResponse {
  return NextResponse.json(
    { error: user ? "Administrator access is required for team management." : "Sign in as an administrator." },
    { status: user ? 403 : 401 },
  );
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || !hasCapability(user, "team.manage")) return deny(user);
  try {
    assertSameOrigin(request);
    const updated = await updateTeamUserRole((await params).id, roleSchema.parse(await request.json()).role, user.id);
    revalidatePath("/admin/team");
    return NextResponse.json({ user: updated });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Choose a valid account role." }, { status: 400 });
    if (error instanceof TeamAccountError) return NextResponse.json({ error: error.message }, { status: error.statusCode });
    if (error instanceof RequestSecurityError) return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: "The account role could not be updated." }, { status: 500 });
  }
}
