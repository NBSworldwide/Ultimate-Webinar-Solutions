import { NextResponse } from "next/server";
import { destroyCurrentSession, SESSION_COOKIE } from "@/lib/auth";
import { assertSameOrigin, RequestSecurityError } from "@/lib/request-security";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
  } catch (error) {
    if (error instanceof RequestSecurityError) return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: "The request could not be verified." }, { status: 400 });
  }
  await destroyCurrentSession();
  const response = NextResponse.redirect(new URL("/login", request.url));
  response.cookies.set({ name: SESSION_COOKIE, value: "", httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 });
  return response;
}
