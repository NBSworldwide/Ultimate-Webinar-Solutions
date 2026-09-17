import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { completeRegistration, DomainError } from "@/lib/data";
import { getPrivateAccessToken } from "@/lib/private-access";
import { assertSameOrigin, RequestSecurityError } from "@/lib/request-security";
import { clientKey, enforceRateLimit, RateLimitError } from "@/lib/rate-limit";

const registrationSchema = z.object({
  holdToken: z.string().min(20).max(200),
  phone: z.string().trim().min(7).max(40),
  consent: z.boolean(),
  smsConsent: z.boolean().default(false),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    await enforceRateLimit("registration", clientKey(request), 30, 10 * 60_000);
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: "Create or sign in to a customer account before completing registration." }, { status: 401 });
    const webinarId = (await params).id;
    const body = registrationSchema.parse(await request.json());
    const result = await completeRegistration({ ...body, webinarId, userId: currentUser.id, name: currentUser.name, email: currentUser.email, privateAccessToken: await getPrivateAccessToken() });
    return NextResponse.json({ success: true, registration: { groupId: result.groupId, webinarTitle: result.webinarTitle, registrationCount: result.registrationIds.length } });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Check the registration details and try again." }, { status: 400 });
    if (error instanceof DomainError) return NextResponse.json({ error: error.message }, { status: error.statusCode });
    if (error instanceof RequestSecurityError) return NextResponse.json({ error: error.message }, { status: 403 });
    if (error instanceof RateLimitError) return NextResponse.json({ error: error.message }, { status: 429, headers: { "Retry-After": String(error.retryAfterSeconds) } });
    return NextResponse.json({ error: "Registration is temporarily unavailable." }, { status: 500 });
  }
}
