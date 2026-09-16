import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyPrivateInvite, PRIVATE_ACCESS_COOKIE, privateSessionMaxAge } from "@/lib/private-access";
import { assertSameOrigin, RequestSecurityError } from "@/lib/request-security";
import { clientKey, enforceRateLimit, RateLimitError } from "@/lib/rate-limit";

const accessSchema = z.object({
  email: z.string().trim().email().max(200),
  code: z.string().trim().min(8).max(20),
});

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    assertSameOrigin(request);
    await enforceRateLimit("private-invite", clientKey(request), 10, 10 * 60_000);
    const body = accessSchema.parse(await request.json());
    const result = await verifyPrivateInvite((await params).slug, body.email, body.code);
    if (!result) {
      return NextResponse.json({ error: "The invitation details could not be verified." }, { status: 401 });
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set({
      name: PRIVATE_ACCESS_COOKIE,
      value: result.accessToken,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: privateSessionMaxAge(result.expiresAt),
    });
    return response;
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Enter the invited email and access code." }, { status: 400 });
    if (error instanceof RequestSecurityError) return NextResponse.json({ error: error.message }, { status: 403 });
    if (error instanceof RateLimitError) return NextResponse.json({ error: error.message }, { status: 429, headers: { "Retry-After": String(error.retryAfterSeconds) } });
    return NextResponse.json({ error: "Private access is temporarily unavailable." }, { status: 500 });
  }
}
