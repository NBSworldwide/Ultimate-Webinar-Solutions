import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { createWebinarInvites, DomainError } from "@/lib/data";
import { assertSameOrigin, RequestSecurityError } from "@/lib/request-security";
import { clientKey, enforceRateLimit, RateLimitError } from "@/lib/rate-limit";

const inviteSchema = z.object({
  emails: z.union([z.string().max(12_000), z.array(z.string().max(200)).max(500)]),
  expiresAt: z.string().datetime({ offset: true }).optional(),
});

function parseEmails(value: string | string[]): string[] {
  return (Array.isArray(value) ? value : value.split(/[\s,;]+/)).map((email) => email.trim()).filter(Boolean);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Admin access is required." }, { status: 401 });

  try {
    assertSameOrigin(request);
    await enforceRateLimit("private-invite-admin", clientKey(request), 20, 10 * 60_000);
    const body = inviteSchema.parse(await request.json());
    const generated = await createWebinarInvites((await params).id, parseEmails(body.emails), user.id, body.expiresAt);
    revalidatePath("/admin/private-webinars");
    return NextResponse.json({ invites: generated }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Enter one or more valid email addresses." }, { status: 400 });
    if (error instanceof DomainError) return NextResponse.json({ error: error.message }, { status: error.statusCode });
    if (error instanceof RequestSecurityError) return NextResponse.json({ error: error.message }, { status: 403 });
    if (error instanceof RateLimitError) return NextResponse.json({ error: error.message }, { status: 429, headers: { "Retry-After": String(error.retryAfterSeconds) } });
    return NextResponse.json({ error: "The invitations could not be created." }, { status: 500 });
  }
}
