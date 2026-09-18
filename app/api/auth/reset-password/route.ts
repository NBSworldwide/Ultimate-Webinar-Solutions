import { NextResponse } from "next/server";
import { z } from "zod";
import { completePasswordReset } from "@/lib/account-security";
import { DomainError } from "@/lib/errors";
import { assertSameOrigin, RequestSecurityError } from "@/lib/request-security";

const resetPasswordSchema = z.object({
  token: z.string().trim().min(20).max(500),
  password: z.string().min(12).max(200),
  confirmPassword: z.string().min(12).max(200),
}).refine((value) => value.password === value.confirmPassword, { message: "The passwords do not match." });

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const body = resetPasswordSchema.parse(await request.json());
    await completePasswordReset(body.token, body.password);
    return NextResponse.json({ message: "Your password was reset successfully. You can sign in now." });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Use a valid reset link and matching passwords with at least 12 characters." }, { status: 400 });
    if (error instanceof DomainError) return NextResponse.json({ error: error.message }, { status: error.statusCode });
    if (error instanceof RequestSecurityError) return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: "The password reset could not be completed." }, { status: 500 });
  }
}
