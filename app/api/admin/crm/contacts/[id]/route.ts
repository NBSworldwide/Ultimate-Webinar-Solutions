import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { DomainError, updateCrmContact } from "@/lib/crm";
import { assertSameOrigin, RequestSecurityError } from "@/lib/request-security";

const updateSchema = z.object({
  name: z.string().trim().min(2).max(140).optional(),
  phone: z.string().trim().max(40).optional(),
  company: z.string().trim().max(140).optional(),
  lifecycleStage: z.enum(["lead", "attendee", "customer", "inactive"]).optional(),
  marketingConsent: z.boolean().optional(),
  smsConsent: z.boolean().optional(),
  smsOptedOut: z.boolean().optional(),
  unsubscribed: z.boolean().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Admin access is required." }, { status: 401 });
  try {
    assertSameOrigin(request);
    const contact = await updateCrmContact((await params).id, updateSchema.parse(await request.json()), user.id);
    revalidatePath("/admin/crm");
    return NextResponse.json({ contact });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "The contact update is invalid." }, { status: 400 });
    if (error instanceof DomainError) return NextResponse.json({ error: error.message }, { status: error.statusCode });
    if (error instanceof RequestSecurityError) return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: "The contact could not be updated." }, { status: 500 });
  }
}
