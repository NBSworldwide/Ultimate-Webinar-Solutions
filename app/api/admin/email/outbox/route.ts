import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getEmailOutbox } from "@/lib/email";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Admin access is required." }, { status: 401 });
  return NextResponse.json({ outbox: await getEmailOutbox() });
}
