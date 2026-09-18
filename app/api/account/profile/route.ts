import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { updateAccountProfile } from "@/lib/account-security";
import { DomainError } from "@/lib/errors";
import { assertSameOrigin, RequestSecurityError } from "@/lib/request-security";

const profileSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(240),
  phone: z.string().trim().max(40).default(""),
  mobilePhone: z.string().trim().max(40).default(""),
  addressLine1: z.string().trim().max(160).default(""),
  addressLine2: z.string().trim().max(160).default(""),
  city: z.string().trim().max(100).default(""),
  region: z.string().trim().max(100).default(""),
  postalCode: z.string().trim().max(24).default(""),
  country: z.string().trim().max(80).default(""),
});

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  try {
    assertSameOrigin(request);
    const result = await updateAccountProfile(user.id, profileSchema.parse(await request.json()));
    revalidatePath("/account");
    return NextResponse.json({ profile: result.profile, emailChangeRequested: result.emailChangeRequested, message: result.emailChangeRequested ? "Profile saved. Check both email inboxes to finish the email change." : "Profile saved." });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Enter a name and valid email address. Other profile fields are optional." }, { status: 400 });
    if (error instanceof DomainError) return NextResponse.json({ error: error.message }, { status: error.statusCode });
    if (error instanceof RequestSecurityError) return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: "Your account profile could not be saved." }, { status: 500 });
  }
}
