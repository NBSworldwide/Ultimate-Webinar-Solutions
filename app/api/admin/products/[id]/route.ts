import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { DomainError, updateProduct } from "@/lib/commerce";
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

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Admin access is required." }, { status: 401 });
  try {
    assertSameOrigin(request);
    const product = await updateProduct((await params).id, productSchema.parse(await request.json()), user.id);
    revalidatePath("/products");
    revalidatePath(`/products/${product.slug}`);
    revalidatePath("/admin/products");
    return NextResponse.json({ product: { id: product.id, slug: product.slug } });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Complete all required product fields." }, { status: 400 });
    if (error instanceof DomainError) return NextResponse.json({ error: error.message }, { status: error.statusCode });
    if (error instanceof RequestSecurityError) return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: "The product could not be updated." }, { status: 500 });
  }
}
