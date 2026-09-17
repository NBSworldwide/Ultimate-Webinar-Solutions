import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { createWebinar, DomainError } from "@/lib/data";
import { assertSameOrigin, RequestSecurityError } from "@/lib/request-security";

function isValidTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

const createSchema = z.object({
  title: z.string().trim().min(3).max(140),
  eyebrow: z.string().trim().min(2).max(60),
  description: z.string().trim().min(20).max(500),
  startsAt: z.string().datetime({ offset: true }),
  timezone: z.string().trim().min(1).max(64).refine(isValidTimeZone, "Choose a valid time zone."),
  durationMinutes: z.number().int().min(15).max(480),
  hostName: z.string().trim().min(2).max(100),
  tierName: z.string().trim().min(2).max(80),
  priceCents: z.number().int().min(0).max(1000000).default(0),
  capacity: z.number().int().min(1).max(500),
  status: z.enum(["draft", "published"]),
  visibility: z.enum(["public", "private"]).default("public"),
  pricingModel: z.enum(["fixed_per_seat", "split_total_value"]).default("fixed_per_seat"),
  referenceValueCents: z.number().int().min(0).max(100000000).nullable().optional(),
  roundingMode: z.enum(["exact_cents", "nearest_dollar", "round_up_dollar"]).default("exact_cents"),
  giveawayEnabled: z.boolean().default(false),
  prizeProductId: z.string().trim().min(1).nullable().optional(),
  claimDeadline: z.string().datetime({ offset: true }).nullable().optional(),
  fulfillmentNotes: z.string().trim().max(3000).default(""),
}).superRefine((value, context) => {
  if (value.pricingModel === "split_total_value" && value.referenceValueCents === null || value.pricingModel === "split_total_value" && value.referenceValueCents === undefined) {
    context.addIssue({ code: "custom", path: ["referenceValueCents"], message: "A total item value is required for split pricing." });
  }
  if (value.giveawayEnabled && !value.prizeProductId) {
    context.addIssue({ code: "custom", path: ["prizeProductId"], message: "Choose a prize product." });
  }
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Admin access is required." }, { status: 401 });
  try {
    assertSameOrigin(request);
    const body = createSchema.parse(await request.json());
    const webinar = await createWebinar(body, user.id);
    revalidatePath("/webinars");
    return NextResponse.json({ webinar: { id: webinar.id, slug: webinar.slug } }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Complete all required webinar fields." }, { status: 400 });
    if (error instanceof DomainError) return NextResponse.json({ error: error.message }, { status: error.statusCode });
    if (error instanceof RequestSecurityError) return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: "The webinar could not be created." }, { status: 500 });
  }
}
