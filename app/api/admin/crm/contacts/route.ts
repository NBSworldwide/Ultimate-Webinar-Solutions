import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { createCrmContact, DomainError, getCrmContacts } from "@/lib/crm";
import { assertSameOrigin, RequestSecurityError } from "@/lib/request-security";

const contactSchema = z.object({
  email: z.string().trim().email().max(200),
  name: z.string().trim().min(2).max(140),
  phone: z.string().trim().max(40).default(""),
  company: z.string().trim().max(140).default(""),
  lifecycleStage: z.enum(["lead", "attendee", "customer", "inactive"]).default("lead"),
  marketingConsent: z.boolean().default(false),
  smsConsent: z.boolean().default(false),
});

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Admin access is required." }, { status: 401 });
  const search = new URL(request.url).searchParams.get("q") ?? "";
  return NextResponse.json({ contacts: await getCrmContacts(search) });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Admin access is required." }, { status: 401 });
  try {
    assertSameOrigin(request);
    const contact = await createCrmContact(contactSchema.parse(await request.json()), user.id);
    return NextResponse.json({ contact: { id: contact.id } }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Complete the contact fields." }, { status: 400 });
    if (error instanceof DomainError) return NextResponse.json({ error: error.message }, { status: error.statusCode });
    if (error instanceof RequestSecurityError) return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: "The contact could not be saved." }, { status: 500 });
  }
}
