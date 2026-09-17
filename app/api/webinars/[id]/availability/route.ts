import { NextResponse } from "next/server";
import { getSeatAvailability, DomainError } from "@/lib/data";
import { getPrivateAccessToken } from "@/lib/private-access";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const availability = await getSeatAvailability((await params).id, await getPrivateAccessToken());
    if (!availability) return NextResponse.json({ error: "This session is not available for registration." }, { status: 404 });
    return NextResponse.json({ availability }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    if (error instanceof DomainError) return NextResponse.json({ error: error.message }, { status: error.statusCode });
    return NextResponse.json({ error: "Seat availability is temporarily unavailable." }, { status: 500 });
  }
}
