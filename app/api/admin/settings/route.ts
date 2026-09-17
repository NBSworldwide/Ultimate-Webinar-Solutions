import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { DomainError } from "@/lib/errors";
import { assertSameOrigin, RequestSecurityError } from "@/lib/request-security";
import { updateSiteSettings } from "@/lib/site-settings";

const optionalUrl = z.string().trim().max(500).refine((value) => value === "" || /^https?:\/\//i.test(value), "Use an http(s) URL or leave this field blank.");
function isValidTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

const settingsSchema = z.object({
  displayName: z.string().trim().min(2).max(140),
  legalName: z.string().trim().max(180),
  tagline: z.string().trim().max(240),
  description: z.string().trim().max(1000),
  logoUrl: optionalUrl,
  logoAlt: z.string().trim().max(180),
  primaryEmail: z.string().trim().max(254).email().or(z.literal("")),
  supportEmail: z.string().trim().max(254).email().or(z.literal("")),
  phone: z.string().trim().max(40),
  addressLine1: z.string().trim().max(160),
  addressLine2: z.string().trim().max(160),
  city: z.string().trim().max(100),
  region: z.string().trim().max(100),
  postalCode: z.string().trim().max(24),
  country: z.string().trim().regex(/^[A-Za-z]{2}$/),
  websiteUrl: optionalUrl,
  timezone: z.string().trim().min(1).max(80).refine(isValidTimeZone, "Choose a valid IANA time zone."),
  currency: z.string().trim().regex(/^[A-Za-z]{3}$/),
  supportUrl: optionalUrl,
  privacyUrl: optionalUrl,
  termsUrl: optionalUrl,
  shippingPolicyUrl: optionalUrl,
  businessHours: z.string().trim().max(240),
  linkedinUrl: optionalUrl,
  facebookUrl: optionalUrl,
  instagramUrl: optionalUrl,
  ageGateEnabled: z.boolean(),
});

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Admin access is required." }, { status: 401 });
  try {
    assertSameOrigin(request);
    const settings = await updateSiteSettings(settingsSchema.parse(await request.json()), user.id);
    revalidatePath("/", "layout");
    revalidatePath("/admin/settings");
    return NextResponse.json({ settings });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Check the company profile fields and URL formats." }, { status: 400 });
    if (error instanceof DomainError) return NextResponse.json({ error: error.message }, { status: error.statusCode });
    if (error instanceof RequestSecurityError) return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: "The company profile could not be saved." }, { status: 500 });
  }
}
