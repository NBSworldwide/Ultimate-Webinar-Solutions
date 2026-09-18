import { NextResponse } from "next/server";
import { z } from "zod";
import { submitForm } from "@/lib/forms";
import { DomainError } from "@/lib/errors";
import { assertSameOrigin, RequestSecurityError } from "@/lib/request-security";
import { clientKey, enforceRateLimit, RateLimitError } from "@/lib/rate-limit";

const submissionSchema = z.object({
  values: z.record(z.string(), z.union([z.string().max(10_000), z.array(z.string().max(500)).max(50)])).refine((value) => Object.keys(value).length <= 100, "Too many form fields."),
  startedAt: z.number().finite().optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    assertSameOrigin(request);
    await enforceRateLimit("form", clientKey(request), 30, 10 * 60_000);
    const body = submissionSchema.parse(await request.json());
    const headers = request.headers;
    const result = await submitForm((await params).slug, body.values, {
      startedAt: body.startedAt,
      ipAddress: headers.get("x-forwarded-for") ?? headers.get("x-real-ip") ?? undefined,
      country: headers.get("x-vercel-ip-country") ?? undefined,
      userAgent: headers.get("user-agent") ?? undefined,
      referrer: headers.get("referer") ?? undefined,
    });
    return NextResponse.json({ success: true, result });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Check the form fields and try again." }, { status: 400 });
    if (error instanceof DomainError) return NextResponse.json({ error: error.message }, { status: error.statusCode });
    if (error instanceof RequestSecurityError) return NextResponse.json({ error: error.message }, { status: 403 });
    if (error instanceof RateLimitError) return NextResponse.json({ error: error.message }, { status: 429, headers: { "Retry-After": String(error.retryAfterSeconds) } });
    return NextResponse.json({ error: "The form submission could not be saved." }, { status: 500 });
  }
}
