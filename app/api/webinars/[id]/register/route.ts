import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { completeRegistration, DomainError } from "@/lib/data";
import { assertSameOrigin, RequestSecurityError } from "@/lib/request-security";
import { clientKey, enforceRateLimit, RateLimitError } from "@/lib/rate-limit";

const registrationSchema = z.object({
  holdToken: z.string().min(20).max(200),
  name: z.string().trim().min(2).max(120),
  email: z.string().email().max(200),
  phone: z.string().trim().min(7).max(40),
  consent: z.boolean(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    enforceRateLimit("registration", clientKey(request), 30, 10 * 60_000);
    const webinarId = (await params).id;
    const body = registrationSchema.parse(await request.json());
    const currentUser = await getCurrentUser();
    const result = completeRegistration({ ...body, webinarId, userId: currentUser?.id ?? null });
    return NextResponse.json({ success: true, registration: { groupId: result.groupId, webinarTitle: result.webinarTitle, registrationCount: result.registrationIds.length } });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Check the registration details and try again." }, { status: 400 });
    if (error instanceof DomainError) return NextResponse.json({ error: error.message }, { status: error.statusCode });
    if (error instanceof RequestSecurityError) return NextResponse.json({ error: error.message }, { status: 403 });
    if (error instanceof RateLimitError) return NextResponse.json({ error: error.message }, { status: 429, headers: { "Retry-After": String(error.retryAfterSeconds) } });
    return NextResponse.json({ error: "Registration is temporarily unavailable." }, { status: 500 });
  }
}
