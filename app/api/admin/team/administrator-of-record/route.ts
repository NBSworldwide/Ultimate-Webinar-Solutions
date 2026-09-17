import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser, hasCapability } from "@/lib/auth";
import { assertSameOrigin, RequestSecurityError } from "@/lib/request-security";
import { getAdministratorOfRecord, setAdministratorOfRecord, TeamAccountError } from "@/lib/team";

const administratorSchema = z.object({ userId: z.string().trim().min(1).max(200) });

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !hasCapability(user, "team.view")) return NextResponse.json({ error: user ? "Team access is required." : "Sign in to continue." }, { status: user ? 403 : 401 });
  try {
    return NextResponse.json({ administratorOfRecord: await getAdministratorOfRecord() });
  } catch (error) {
    if (error instanceof TeamAccountError) return NextResponse.json({ error: error.message }, { status: error.statusCode });
    return NextResponse.json({ error: "The administrator of record could not be loaded." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user || !hasCapability(user, "team.manage")) return NextResponse.json({ error: user ? "Only administrators can change the administrator of record." : "Sign in as an administrator." }, { status: user ? 403 : 401 });
  try {
    assertSameOrigin(request);
    const administratorOfRecord = await setAdministratorOfRecord(administratorSchema.parse(await request.json()).userId, user.id);
    revalidatePath("/admin/team");
    return NextResponse.json({ administratorOfRecord });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Choose an administrator of record." }, { status: 400 });
    if (error instanceof TeamAccountError) return NextResponse.json({ error: error.message }, { status: error.statusCode });
    if (error instanceof RequestSecurityError) return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: "The administrator of record could not be saved." }, { status: 500 });
  }
}
