import { NextResponse } from "next/server";
import { z } from "zod";
import { AccountCreationError, createAttendeeAccount, createSession, safeReturnPath, SESSION_COOKIE } from "@/lib/auth";
import { assertSameOrigin, RequestSecurityError } from "@/lib/request-security";
import { clientKey, enforceRateLimit, RateLimitError } from "@/lib/rate-limit";

const registrationSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  password: z.string().min(12).max(200),
  returnTo: z.string().max(500).optional(),
});

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await enforceRateLimit("account-registration", clientKey(request), 5, 15 * 60_000);
    const body = registrationSchema.parse(await request.json());
    const user = await createAttendeeAccount(body);
    const token = await createSession(user.id);
    const response = NextResponse.json({ redirectTo: safeReturnPath(body.returnTo, "/account") }, { status: 201 });
    response.cookies.set({ name: SESSION_COOKIE, value: token, httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 14 });
    return response;
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Use a name, valid email, and a password with at least 12 characters." }, { status: 400 });
    if (error instanceof AccountCreationError) return NextResponse.json({ error: error.message }, { status: error.statusCode });
    if (error instanceof RequestSecurityError) return NextResponse.json({ error: error.message }, { status: 403 });
    if (error instanceof RateLimitError) return NextResponse.json({ error: error.message }, { status: 429, headers: { "Retry-After": String(error.retryAfterSeconds) } });
    return NextResponse.json({ error: "The customer account could not be created." }, { status: 500 });
  }
}
