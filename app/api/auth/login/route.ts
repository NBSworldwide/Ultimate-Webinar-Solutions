import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticate, createSession, safeReturnPath, SESSION_COOKIE } from "@/lib/auth";
import { assertSameOrigin, RequestSecurityError } from "@/lib/request-security";
import { clientKey, enforceRateLimit, RateLimitError } from "@/lib/rate-limit";

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1).max(200), returnTo: z.string().max(500).optional() });

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await enforceRateLimit("login", clientKey(request), 10, 10 * 60_000);
    const body = loginSchema.parse(await request.json());
    const user = await authenticate(body.email, body.password);
    if (!user) return NextResponse.json({ error: "Those credentials were not recognized." }, { status: 401 });
    const token = await createSession(user.id);
    const response = NextResponse.json({ redirectTo: safeReturnPath(body.returnTo, user.role === "admin" ? "/admin" : "/account") });
    response.cookies.set({ name: SESSION_COOKIE, value: token, httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 14 });
    return response;
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Enter a valid email and password." }, { status: 400 });
    if (error instanceof RequestSecurityError) return NextResponse.json({ error: error.message }, { status: 403 });
    if (error instanceof RateLimitError) return NextResponse.json({ error: error.message }, { status: 429, headers: { "Retry-After": String(error.retryAfterSeconds) } });
    return NextResponse.json({ error: "Sign in is temporarily unavailable." }, { status: 500 });
  }
}
