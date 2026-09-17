import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { createProductVariant, getProductVariants, updateProductVariant } from "@/lib/catalog";
import { DomainError } from "@/lib/errors";
import { assertSameOrigin, RequestSecurityError } from "@/lib/request-security";

const optionValues = z.record(z.string().trim().min(1).max(60), z.string().trim().min(1).max(120)).default({});
const variantSchema = z.object({
  id: z.string().min(1).optional(), name: z.string().trim().min(1).max(120), sku: z.string().trim().min(2).max(40).regex(/^[A-Za-z0-9-]+$/), optionValues,
  priceCents: z.number().int().min(0).max(1000000), compareAtPriceCents: z.number().int().min(0).max(1000000).nullable().optional(), salePriceCents: z.number().int().min(0).max(1000000).nullable().optional(), saleStartsAt: z.string().datetime({ offset: true }).nullable().optional(), saleEndsAt: z.string().datetime({ offset: true }).nullable().optional(), inventoryQuantity: z.number().int().min(0).max(100000), weightGrams: z.number().int().min(0).max(100000), status: z.enum(["draft", "active", "archived"]),
});

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Admin access is required." }, { status: 401 });
  try { return NextResponse.json({ variants: await getProductVariants((await params).id) }); } catch { return NextResponse.json({ error: "Variants could not be loaded." }, { status: 500 }); }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Admin access is required." }, { status: 401 });
  try {
    assertSameOrigin(request);
    const productId = (await params).id;
    const input = variantSchema.parse(await request.json());
    const variant = input.id ? await updateProductVariant(input.id, productId, input, user.id) : await createProductVariant(productId, input, user.id);
    revalidatePath("/products");
    revalidatePath("/admin/products");
    return NextResponse.json({ variant }, { status: input.id ? 200 : 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Complete the variant fields with valid values." }, { status: 400 });
    if (error instanceof DomainError) return NextResponse.json({ error: error.message }, { status: error.statusCode });
    if (error instanceof RequestSecurityError) return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: "The variant could not be saved." }, { status: 500 });
  }
}
