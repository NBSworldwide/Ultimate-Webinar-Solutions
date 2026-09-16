import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { DomainError, drawWinner } from "@/lib/data";
import { assertSameOrigin, RequestSecurityError } from "@/lib/request-security";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Admin access is required." }, { status: 401 });
  try {
    assertSameOrigin(_request);
    const winner = await drawWinner((await params).id, user.id);
    return NextResponse.json({ winner: { customerName: winner.customerName, seatNumber: winner.seatNumber } });
  } catch (error) {
    if (error instanceof DomainError) return NextResponse.json({ error: error.message }, { status: error.statusCode });
    if (error instanceof RequestSecurityError) return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: "The winner draw could not be completed." }, { status: 500 });
  }
}
