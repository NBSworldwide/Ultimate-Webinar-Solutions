import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { hasCapability } from "@/lib/authorization";
import { createProduct, DomainError } from "@/lib/commerce";
import { assertSameOrigin, RequestSecurityError } from "@/lib/request-security";

const productSchema = z.object({
  name: z.string().trim().min(2).max(140),
  sku: z.string().trim().min(2).max(40).regex(/^[A-Za-z0-9-]+$/),
  description: z.string().trim().min(20).max(500),
  details: z.string().trim().min(20).max(1000),
  category: z.string().trim().min(2).max(80),
  priceCents: z.number().int().min(0).max(1000000),
  inventoryQuantity: z.number().int().min(0).max(100000),
  weightGrams: z.number().int().min(0).max(100000),
  status: z.enum(["draft", "active", "archived"]),
  compareAtPriceCents: z.number().int().min(0).max(1000000).nullable().optional(),
  salePriceCents: z.number().int().min(0).max(1000000).nullable().optional(),
  saleStartsAt: z.string().datetime({ offset: true }).nullable().optional(),
  saleEndsAt: z.string().datetime({ offset: true }).nullable().optional(),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || !hasCapability(user, "catalog.manage")) return NextResponse.json({ error: user ? "You do not have permission for this area." : "Sign in to continue." }, { status: user ? 403 : 401 });
  try {
    assertSameOrigin(request);
    const product = await createProduct(productSchema.parse(await request.json()), user.id);
    revalidatePath("/products");
    return NextResponse.json({ product: { id: product.id, slug: product.slug } }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Complete all required product fields." }, { status: 400 });
    if (error instanceof DomainError) return NextResponse.json({ error: error.message }, { status: error.statusCode });
    if (error instanceof RequestSecurityError) return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: "The product could not be created." }, { status: 500 });
  }
}
