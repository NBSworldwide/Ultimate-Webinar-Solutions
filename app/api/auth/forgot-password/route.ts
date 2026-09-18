import { NextResponse } from "next/server";
import { z } from "zod";
import { requestPasswordReset } from "@/lib/account-security";
import { assertSameOrigin, RequestSecurityError } from "@/lib/request-security";
import { clientKey, enforceRateLimit, RateLimitError } from "@/lib/rate-limit";

const forgotPasswordSchema = z.object({ identifier: z.string().trim().min(3).max(240) });

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await enforceRateLimit("forgot-password", clientKey(request), 5, 15 * 60_000);
    const { identifier } = forgotPasswordSchema.parse(await request.json());
    await requestPasswordReset(identifier);
    return NextResponse.json({ message: "If an account matches that email or username, a password-reset link is on its way." });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Enter the email address or username for your account." }, { status: 400 });
    if (error instanceof RequestSecurityError) return NextResponse.json({ error: error.message }, { status: 403 });
    if (error instanceof RateLimitError) return NextResponse.json({ error: error.message }, { status: 429, headers: { "Retry-After": String(error.retryAfterSeconds) } });
    return NextResponse.json({ error: "Password recovery is temporarily unavailable." }, { status: 500 });
  }
}
