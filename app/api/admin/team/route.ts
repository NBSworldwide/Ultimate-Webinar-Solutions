import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser, hasCapability } from "@/lib/auth";
import { assertSameOrigin, RequestSecurityError } from "@/lib/request-security";
import { createManagerAccount, getTeamUsers, TeamAccountError } from "@/lib/team";

const managerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(240),
  password: z.string().min(20).max(200),
});

function deny(user: Awaited<ReturnType<typeof getCurrentUser>>): NextResponse {
  return NextResponse.json(
    { error: user ? "Administrator access is required for team management." : "Sign in as an administrator." },
    { status: user ? 403 : 401 },
  );
}

export async function GET() {
  const user = await getCurrentUser();
  if (!hasCapability(user, "team.manage")) return deny(user);
  try {
    return NextResponse.json({ users: await getTeamUsers() });
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
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Enter a name, valid email, and a password of at least 20 characters." }, { status: 400 });
    if (error instanceof TeamAccountError) return NextResponse.json({ error: error.message }, { status: error.statusCode });
    if (error instanceof RequestSecurityError) return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: "The manager account could not be created." }, { status: 500 });
  }
}
