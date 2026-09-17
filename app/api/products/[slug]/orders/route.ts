import { NextResponse } from "next/server";
import { z } from "zod";
import { createProductOrder, DomainError, getProductBySlug } from "@/lib/commerce";
import { assertSameOrigin, RequestSecurityError } from "@/lib/request-security";
import { clientKey, enforceRateLimit, RateLimitError } from "@/lib/rate-limit";

const orderSchema = z.object({
  quantity: z.number().int().min(1).max(25),
  variantId: z.string().min(1).nullable().optional(),
  customerName: z.string().trim().min(2).max(120),
  customerEmail: z.string().trim().email().max(200),
  customerPhone: z.string().trim().min(7).max(40),
  shippingName: z.string().trim().min(2).max(120),
  shippingAddressLine1: z.string().trim().min(3).max(160),
  shippingAddressLine2: z.string().trim().max(160).optional(),
  shippingCity: z.string().trim().min(2).max(80),
  shippingRegion: z.string().trim().min(2).max(80),
  shippingPostalCode: z.string().trim().min(3).max(20),
  shippingCountry: z.string().trim().length(2).optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    assertSameOrigin(request);
    await enforceRateLimit("product-checkout", clientKey(request), 8, 10 * 60_000);
    const body = orderSchema.parse(await request.json());
    const product = await getProductBySlug((await params).slug);
    if (!product) return NextResponse.json({ error: "That product is no longer available." }, { status: 404 });
    const order = await createProductOrder({ ...body, items: [{ productId: product.id, variantId: body.variantId ?? null, quantity: body.quantity }] });
    return NextResponse.json({ order: { id: order.id, orderNumber: order.orderNumber, totalCents: order.totalCents, fulfillmentStatus: order.fulfillmentStatus } }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Complete the customer and shipping details." }, { status: 400 });
    if (error instanceof DomainError) return NextResponse.json({ error: error.message }, { status: error.statusCode });
    if (error instanceof RequestSecurityError) return NextResponse.json({ error: error.message }, { status: 403 });
    if (error instanceof RateLimitError) return NextResponse.json({ error: error.message }, { status: 429, headers: { "Retry-After": String(error.retryAfterSeconds) } });
    return NextResponse.json({ error: "The order could not be created." }, { status: 500 });
  }
}
