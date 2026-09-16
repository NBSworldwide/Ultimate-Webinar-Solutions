import { NextResponse } from "next/server";
import { z } from "zod";
import { createSeatHold, DomainError } from "@/lib/data";
import { assertSameOrigin, RequestSecurityError } from "@/lib/request-security";
import { clientKey, enforceRateLimit, RateLimitError } from "@/lib/rate-limit";

const holdSchema = z.object({ seatIds: z.array(z.string().min(1).max(120)).min(1).max(6) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    enforceRateLimit("hold", clientKey(request), 20, 10 * 60_000);
    const body = holdSchema.parse(await request.json());
    const result = await createSeatHold((await params).id, body.seatIds);
    return NextResponse.json({ hold: result });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Choose valid seats." }, { status: 400 });
    if (error instanceof DomainError) return NextResponse.json({ error: error.message }, { status: error.statusCode });
    if (error instanceof RequestSecurityError) return NextResponse.json({ error: error.message }, { status: 403 });
    if (error instanceof RateLimitError) return NextResponse.json({ error: error.message }, { status: 429, headers: { "Retry-After": String(error.retryAfterSeconds) } });
    return NextResponse.json({ error: "Seats are temporarily unavailable." }, { status: 500 });
  }
}
