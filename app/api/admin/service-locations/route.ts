import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { hasCapability } from "@/lib/authorization";
import { DomainError } from "@/lib/errors";
import { assertSameOrigin, RequestSecurityError } from "@/lib/request-security";
import { createServiceLocation, type ServiceLocationInput } from "@/lib/service-locations";

const faqSchema = z.object({ question: z.string().trim().min(1).max(240), answer: z.string().trim().min(1).max(1_000) });
const serviceLocationSchema = z.object({
  slug: z.string().trim().min(1).max(80),
  city: z.string().trim().min(1).max(100),
  region: z.string().trim().min(1).max(100),
  timezone: z.string().trim().min(1).max(80),
  accent: z.enum(["teal", "coral", "gold"]),
  eyebrow: z.string().trim().max(140).default(""),
  title: z.string().trim().min(2).max(180),
  summary: z.string().trim().min(1).max(500),
  description: z.string().trim().min(1).max(2_000),
  bestFor: z.array(z.string().trim().min(1).max(240)).min(1).max(12),
  deliveryModes: z.array(z.string().trim().min(1).max(180)).min(1).max(12),
  faqs: z.array(faqSchema).max(12).default([]),
  status: z.enum(["draft", "published", "archived"]),
});

function deny(user: Awaited<ReturnType<typeof getCurrentUser>>): NextResponse {
  return NextResponse.json({ error: user ? "You do not have permission for service location management." : "Sign in to continue." }, { status: user ? 403 : 401 });
}

function revalidateLocationPaths(slug: string): void {
  revalidatePath("/locations");
  revalidatePath(`/locations/${slug}`);
  revalidatePath("/admin/locations");
  revalidatePath("/admin/pages");
  revalidatePath("/sitemap.xml");
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || !hasCapability(user, "content.manage")) return deny(user);
  try {
    assertSameOrigin(request);
    const location = await createServiceLocation(serviceLocationSchema.parse(await request.json()) as ServiceLocationInput, user.id);
    revalidateLocationPaths(location.slug);
    return NextResponse.json({ location }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Check the location identity, copy, and template details." }, { status: 400 });
    if (error instanceof DomainError) return NextResponse.json({ error: error.message }, { status: error.statusCode });
    if (error instanceof RequestSecurityError) return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: "The service location could not be created." }, { status: 500 });
  }
}
