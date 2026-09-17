import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { hasCapability } from "@/lib/authorization";
import { DomainError, updateOrderFulfillment } from "@/lib/commerce";
import { assertSameOrigin, RequestSecurityError } from "@/lib/request-security";

const updateSchema = z.object({
  fulfillmentStatus: z.enum(["unfulfilled", "packing", "shipped", "delivered", "cancelled"]),
  trackingCarrier: z.string().trim().max(80).nullable().optional(),
  trackingNumber: z.string().trim().max(160).nullable().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || !hasCapability(user, "orders.manage")) return NextResponse.json({ error: user ? "You do not have permission for this area." : "Sign in to continue." }, { status: user ? 403 : 401 });
  try {
    assertSameOrigin(request);
    const body = updateSchema.parse(await request.json());
    const order = await updateOrderFulfillment((await params).id, body.fulfillmentStatus, body.trackingCarrier ?? null, body.trackingNumber ?? null, user.id);
    revalidatePath("/admin/orders");
    return NextResponse.json({ order: { id: order.id, fulfillmentStatus: order.fulfillmentStatus } });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Choose a valid fulfillment status." }, { status: 400 });
    if (error instanceof DomainError) return NextResponse.json({ error: error.message }, { status: error.statusCode });
    if (error instanceof RequestSecurityError) return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: "The order could not be updated." }, { status: 500 });
  }
}
