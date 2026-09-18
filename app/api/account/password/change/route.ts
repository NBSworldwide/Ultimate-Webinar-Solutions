import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { requestPasswordChange } from "@/lib/account-security";
import { DomainError } from "@/lib/errors";
import { assertSameOrigin, RequestSecurityError } from "@/lib/request-security";
import { enforceRateLimit, RateLimitError } from "@/lib/rate-limit";

const passwordChangeSchema = z.object({
  password: z.string().min(12).max(200),
  confirmPassword: z.string().min(12).max(200),
}).refine((value) => value.password === value.confirmPassword, { message: "The passwords do not match." });

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  try {
    assertSameOrigin(request);
    await enforceRateLimit("password-change-request", user.id, 5, 60 * 60_000);
    const body = passwordChangeSchema.parse(await request.json());
    await requestPasswordChange(user.id, body.password);
    return NextResponse.json({ message: "Check your email for the authorization link. Your password has not changed yet." }, { status: 202 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Use matching passwords with at least 12 characters." }, { status: 400 });
    if (error instanceof DomainError) return NextResponse.json({ error: error.message }, { status: error.statusCode });
    if (error instanceof RequestSecurityError) return NextResponse.json({ error: error.message }, { status: 403 });
    if (error instanceof RateLimitError) return NextResponse.json({ error: error.message }, { status: 429, headers: { "Retry-After": String(error.retryAfterSeconds) } });
    return NextResponse.json({ error: "The password change request could not be created." }, { status: 500 });
  }
}
