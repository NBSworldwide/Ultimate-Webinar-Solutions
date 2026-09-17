import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { hasCapability } from "@/lib/authorization";
import { getEmailOutbox } from "@/lib/email";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !hasCapability(user, "email.manage")) return NextResponse.json({ error: user ? "You do not have permission for this area." : "Sign in to continue." }, { status: user ? 403 : 401 });
  return NextResponse.json({ outbox: await getEmailOutbox() });
}
