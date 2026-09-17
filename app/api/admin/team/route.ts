import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser, hasCapability } from "@/lib/auth";
import { assertSameOrigin, RequestSecurityError } from "@/lib/request-security";
import { createManagerAccount, getAdministratorOfRecord, getTeamRoleChangeRequests, getTeamUsers, TeamAccountError } from "@/lib/team";
import { USERNAME_PATTERN } from "@/lib/username";

const managerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  username: z.string().trim().toLowerCase().regex(USERNAME_PATTERN),
  email: z.string().trim().email().max(240),
  password: z.string().min(20).max(200),
});

function deny(user: Awaited<ReturnType<typeof getCurrentUser>>): NextResponse {
  return NextResponse.json(
    { error: user ? "Team access is required for this action." : "Sign in to continue." },
    { status: user ? 403 : 401 },
  );
}

export async function GET() {
  const user = await getCurrentUser();
  if (!hasCapability(user, "team.view")) return deny(user);
  try {
    const [users, administratorOfRecord] = await Promise.all([getTeamUsers(), getAdministratorOfRecord()]);
    const pendingRequests = hasCapability(user, "team.approve") ? await getTeamRoleChangeRequests("pending") : [];
    return NextResponse.json({ users, administratorOfRecord, pendingRequests });
  } catch {
    return NextResponse.json({ error: "Team accounts could not be loaded." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || !hasCapability(user, "team.manage")) return deny(user);
  try {
    assertSameOrigin(request);
    const manager = await createManagerAccount(managerSchema.parse(await request.json()), user.id);
    revalidatePath("/admin/team");
    return NextResponse.json({ user: manager }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Enter a name, username, valid email, and a password of at least 20 characters." }, { status: 400 });
    if (error instanceof TeamAccountError) return NextResponse.json({ error: error.message }, { status: error.statusCode });
    if (error instanceof RequestSecurityError) return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: "The manager account could not be created." }, { status: 500 });
  }
}
