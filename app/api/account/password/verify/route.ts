import { NextResponse } from "next/server";
import { authorizePasswordChange } from "@/lib/account-security";
import { DomainError } from "@/lib/errors";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  try {
    await authorizePasswordChange(token);
    return NextResponse.redirect(new URL("/password-change/complete?status=success", request.url));
  } catch (error) {
    const status = error instanceof DomainError ? "error" : "error";
    return NextResponse.redirect(new URL(`/password-change/complete?status=${status}`, request.url));
  }
}
