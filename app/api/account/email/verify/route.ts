import { NextResponse } from "next/server";
import { verifyEmailChangeToken } from "@/lib/account-security";
import { DomainError } from "@/lib/errors";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  try {
    const result = await verifyEmailChangeToken(token);
    const status = result.completed ? "complete" : "partial";
    return NextResponse.redirect(new URL(`/email-change/complete?status=${status}`, request.url));
  } catch (error) {
    const status = error instanceof DomainError ? "error" : "error";
    return NextResponse.redirect(new URL(`/email-change/complete?status=${status}`, request.url));
  }
}
