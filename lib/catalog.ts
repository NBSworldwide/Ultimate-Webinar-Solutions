import { randomUUID } from "node:crypto";
import { assertStandaloneDataset, getDb, type DatabaseClient, type DatabaseRow } from "@/lib/db";
import { DomainError } from "@/lib/errors";
import type { CouponStatus, CouponView, InventorySourceStatus, InventorySourceType, InventorySourceView, InventorySyncMode, ProductListItem, ProductVariantStatus, ProductVariantView, RelatedProductView } from "@/lib/types";

type VariantRow = DatabaseRow & {
  id: string; product_id: string; name: string; sku: string; option_values_json: string;
  price_cents: number | string; compare_at_price_cents: number | string | null; sale_price_cents: number | string | null;
  sale_starts_at: string | null; sale_ends_at: string | null; inventory_quantity: number | string; weight_grams: number | string;
  status: ProductVariantStatus;
};

function effectiveSale(row: Pick<VariantRow, "sale_price_cents" | "sale_starts_at" | "sale_ends_at">): boolean {
  if (row.sale_price_cents === null) return false;
  const now = Date.now();
  return (!row.sale_starts_at || new Date(row.sale_starts_at).getTime() <= now) && (!row.sale_ends_at || new Date(row.sale_ends_at).getTime() > now);
}

function variantView(row: VariantRow): ProductVariantView {
  let optionValues: Record<string, string> = {};
  try {
    const parsed: unknown = JSON.parse(row.option_values_json || "{}");
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) optionValues = Object.fromEntries(Object.entries(parsed).filter(([, value]) => typeof value === "string")) as Record<string, string>;
  } catch { /* Keep a malformed legacy value from breaking the catalog. */ }
  const regularPrice = Number(row.price_cents);
  const salePrice = row.sale_price_cents === null ? null : Number(row.sale_price_cents);
  return {
    id: row.id, productId: row.product_id, name: row.name, sku: row.sku, optionValues,
    priceCents: effectiveSale(row) ? salePrice as number : regularPrice,
    compareAtPriceCents: row.compare_at_price_cents === null ? null : Number(row.compare_at_price_cents),
    salePriceCents: salePrice, saleStartsAt: row.sale_starts_at, saleEndsAt: row.sale_ends_at,
    inventoryQuantity: Number(row.inventory_quantity), weightGrams: Number(row.weight_grams), status: row.status,
  };
}

function validateVariantPrice(input: VariantInput): void {
  if (!Number.isInteger(input.priceCents) || input.priceCents < 0) throw new DomainError("Enter a valid variant price.");
  if (input.compareAtPriceCents !== null && input.compareAtPriceCents !== undefined && input.compareAtPriceCents < input.priceCents) throw new DomainError("Compare-at price must be greater than or equal to the regular price.");
  if (input.salePriceCents !== null && input.salePriceCents !== undefined) {
    if (!Number.isInteger(input.salePriceCents) || input.salePriceCents < 0 || input.salePriceCents >= input.priceCents) throw new DomainError("Sale price must be lower than the regular price.");
    if (input.saleStartsAt && input.saleEndsAt && new Date(input.saleEndsAt).getTime() <= new Date(input.saleStartsAt).getTime()) throw new DomainError("Sale end must be after sale start.");
  }
}

export async function getProductVariants(productId: string, activeOnly = false): Promise<ProductVariantView[]> {
  await assertStandaloneDataset();
  const filter = activeOnly ? "AND status = 'active'" : "";
  const { rows } = await getDb().query<VariantRow>(`SELECT * FROM product_variants WHERE product_id = $1 ${filter} ORDER BY name`, [productId]);
  return rows.map(variantView);
}

export type VariantInput = {
  name: string; sku: string; optionValues: Record<string, string>; priceCents: number;
  compareAtPriceCents?: number | null; salePriceCents?: number | null; saleStartsAt?: string | null; saleEndsAt?: string | null;
  inventoryQuantity: number; weightGrams: number; status: ProductVariantStatus;
};

async function saveVariant(id: string, productId: string, input: VariantInput, actorId: string, update: boolean): Promise<ProductVariantView> {
  await assertStandaloneDataset();
  if (!input.name.trim() || !input.sku.trim()) throw new DomainError("Variant name and SKU are required.");
  if (!Number.isInteger(input.inventoryQuantity) || input.inventoryQuantity < 0) throw new DomainError("Enter a valid variant inventory quantity.");
  if (!Number.isInteger(input.weightGrams) || input.weightGrams < 0) throw new DomainError("Enter a valid variant weight.");
  validateVariantPrice(input);
  const now = new Date().toISOString();
  const database = getDb();
  const client = await database.connect();
  try {
    await client.query("BEGIN");
    const product = await client.query("SELECT id FROM products WHERE id = $1", [productId]);
    if (!product.rows[0]) throw new DomainError("The parent product could not be found.", 404);
    if (update) {
      const result = await client.query<VariantRow>("SELECT * FROM product_variants WHERE id = $1 AND product_id = $2 FOR UPDATE", [id, productId]);
      if (!result.rows[0]) throw new DomainError("The product variant could not be found.", 404);
      await client.query(`UPDATE product_variants SET name=$1,sku=$2,option_values_json=$3,price_cents=$4,compare_at_price_cents=$5,sale_price_cents=$6,sale_starts_at=$7,sale_ends_at=$8,inventory_quantity=$9,weight_grams=$10,status=$11,updated_at=$12 WHERE id=$13`, [input.name.trim(), input.sku.trim().toUpperCase(), JSON.stringify(input.optionValues), input.priceCents, input.compareAtPriceCents ?? null, input.salePriceCents ?? null, input.saleStartsAt ?? null, input.saleEndsAt ?? null, input.inventoryQuantity, input.weightGrams, input.status, now, id]);
    } else {
      await client.query(`INSERT INTO product_variants (id,product_id,name,sku,option_values_json,price_cents,compare_at_price_cents,sale_price_cents,sale_starts_at,sale_ends_at,inventory_quantity,weight_grams,status,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$14)`, [id, productId, input.name.trim(), input.sku.trim().toUpperCase(), JSON.stringify(input.optionValues), input.priceCents, input.compareAtPriceCents ?? null, input.salePriceCents ?? null, input.saleStartsAt ?? null, input.saleEndsAt ?? null, input.inventoryQuantity, input.weightGrams, input.status, now]);
    }
    await client.query("INSERT INTO audit_events (id,actor_id,event_type,entity_type,entity_id,metadata_json,created_at) VALUES ($1,$2,$3,'product_variant',$4,$5,$6)", [randomUUID(), actorId, update ? "product_variant.updated" : "product_variant.created", id, JSON.stringify({ productId, sku: input.sku.trim().toUpperCase(), synthetic: true }), now]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    if (String(error).toLowerCase().includes("unique")) throw new DomainError("Another product or variant already uses that SKU or name.", 409);
    throw error;
  } finally { client.release(); }
  const result = await getDb().query<VariantRow>("SELECT * FROM product_variants WHERE id = $1", [id]);
  if (!result.rows[0]) throw new DomainError("The variant could not be loaded after saving.", 500);
  return variantView(result.rows[0]);
}

export function createProductVariant(productId: string, input: VariantInput, actorId: string): Promise<ProductVariantView> { return saveVariant(`variant-${randomUUID()}`, productId, input, actorId, false); }
export function updateProductVariant(id: string, productId: string, input: VariantInput, actorId: string): Promise<ProductVariantView> { return saveVariant(id, productId, input, actorId, true); }

export async function getRelatedProducts(productId: string): Promise<RelatedProductView[]> {
  await assertStandaloneDataset();
  const { rows } = await getDb().query<DatabaseRow & { product_id: string; related_product_id: string; relation_type: RelatedProductView["relationType"]; related_name: string; related_slug: string; related_sku: string; related_description: string; related_category: string; related_price_cents: number | string; related_inventory_quantity: number | string; related_weight_grams: number | string; related_status: ProductListItem["status"] }>(`SELECT r.product_id,r.related_product_id,r.relation_type,p.name AS related_name,p.slug AS related_slug,p.sku AS related_sku,p.description AS related_description,p.category AS related_category,p.price_cents AS related_price_cents,p.inventory_quantity AS related_inventory_quantity,p.weight_grams AS related_weight_grams,p.status AS related_status FROM product_relations r JOIN products p ON p.id = r.related_product_id WHERE r.product_id = $1 ORDER BY r.relation_type,r.sort_order,p.name`, [productId]);
  return rows.map((row) => ({ productId: row.product_id, relatedProductId: row.related_product_id, relationType: row.relation_type, relatedProduct: { id: row.related_product_id, slug: row.related_slug, name: row.related_name, sku: row.related_sku, description: row.related_description, category: row.related_category, imageUrl: null, priceCents: Number(row.related_price_cents), inventoryQuantity: Number(row.related_inventory_quantity), weightGrams: Number(row.related_weight_grams), status: row.related_status, compareAtPriceCents: null, salePriceCents: null, saleStartsAt: null, saleEndsAt: null } }));
}

export type InventorySourceInput = { name: string; sourceType: InventorySourceType; baseUrl: string; syncMode: InventorySyncMode; safetyStock: number; status: InventorySourceStatus; hasCredentials?: boolean };
type InventoryRow = DatabaseRow & { id: string; name: string; source_type: InventorySourceType; base_url: string; config_ciphertext: string; sync_mode: InventorySyncMode; safety_stock: number | string; status: InventorySourceStatus; last_synced_at: string | null; last_error: string | null; mapping_count: number | string };
export async function getInventorySources(): Promise<InventorySourceView[]> { await assertStandaloneDataset(); const { rows } = await getDb().query<InventoryRow>("SELECT s.*, COUNT(m.id)::int AS mapping_count FROM inventory_sources s LEFT JOIN inventory_mappings m ON m.source_id=s.id GROUP BY s.id ORDER BY s.name"); return rows.map((row) => ({ id: row.id, name: row.name, sourceType: row.source_type, baseUrl: row.base_url, syncMode: row.sync_mode, safetyStock: Number(row.safety_stock), status: row.status, lastSyncedAt: row.last_synced_at, lastError: row.last_error, mappingCount: Number(row.mapping_count), hasCredentials: Boolean(row.config_ciphertext) })); }

export type CouponInput = { code: string; name: string; discountType: "percentage" | "fixed_amount" | "free_shipping"; discountValue: number; minimumOrderCents: number; usageLimit?: number | null; perCustomerLimit?: number | null; startsAt?: string | null; endsAt?: string | null; status: CouponStatus };
type CouponRow = DatabaseRow & { id: string; code: string; name: string; discount_type: CouponView["discountType"]; discount_value: number | string; minimum_order_cents: number | string; usage_limit: number | string | null; per_customer_limit: number | string | null; starts_at: string | null; ends_at: string | null; status: CouponStatus; redemption_count: number | string };
function couponView(row: CouponRow): CouponView { return { id: row.id, code: row.code, name: row.name, discountType: row.discount_type, discountValue: Number(row.discount_value), minimumOrderCents: Number(row.minimum_order_cents), usageLimit: row.usage_limit === null ? null : Number(row.usage_limit), perCustomerLimit: row.per_customer_limit === null ? null : Number(row.per_customer_limit), startsAt: row.starts_at, endsAt: row.ends_at, status: row.status, redemptionCount: Number(row.redemption_count), productIds: [] }; }
export async function getCoupons(): Promise<CouponView[]> { await assertStandaloneDataset(); const { rows } = await getDb().query<CouponRow>("SELECT c.*, COUNT(r.id)::int AS redemption_count FROM coupons c LEFT JOIN coupon_redemptions r ON r.coupon_id=c.id GROUP BY c.id ORDER BY c.updated_at DESC"); return rows.map(couponView); }
export async function createCoupon(input: CouponInput, actorId: string): Promise<CouponView> { await assertStandaloneDataset(); const code = input.code.trim().toUpperCase(); if (!/^[A-Z0-9_-]{3,40}$/.test(code)) throw new DomainError("Coupon codes must use letters, numbers, hyphens, or underscores."); if (!input.name.trim()) throw new DomainError("A coupon name is required."); if (!Number.isInteger(input.discountValue) || input.discountValue < 0 || (input.discountType === "percentage" && input.discountValue > 100)) throw new DomainError("Enter a valid coupon discount."); if (input.startsAt && input.endsAt && new Date(input.endsAt).getTime() <= new Date(input.startsAt).getTime()) throw new DomainError("Coupon end must be after coupon start."); const id = `coupon-${randomUUID()}`; const now = new Date().toISOString(); try { await getDb().query("INSERT INTO coupons (id,code,name,discount_type,discount_value,minimum_order_cents,usage_limit,per_customer_limit,starts_at,ends_at,status,created_by,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$13)", [id, code, input.name.trim(), input.discountType, input.discountValue, input.minimumOrderCents, input.usageLimit ?? null, input.perCustomerLimit ?? null, input.startsAt ?? null, input.endsAt ?? null, input.status, actorId, now]); } catch (error) { if (String(error).toLowerCase().includes("unique")) throw new DomainError("That coupon code is already in use.", 409); throw error; } const coupons = await getCoupons(); const result = coupons.find((coupon) => coupon.id === id); if (!result) throw new DomainError("The coupon could not be loaded after saving.", 500); return result; }

export async function createInventorySource(input: InventorySourceInput, actorId: string): Promise<InventorySourceView> { await assertStandaloneDataset(); if (!input.name.trim()) throw new DomainError("An inventory source name is required."); if (!Number.isInteger(input.safetyStock) || input.safetyStock < 0) throw new DomainError("Enter a valid safety stock amount."); const id = `inventory-${randomUUID()}`; const now = new Date().toISOString(); await getDb().query("INSERT INTO inventory_sources (id,name,source_type,base_url,config_ciphertext,sync_mode,safety_stock,status,created_by,created_at,updated_at) VALUES ($1,$2,$3,$4,'',$5,$6,$7,$8,$9,$9)", [id, input.name.trim(), input.sourceType, input.baseUrl.trim(), input.syncMode, input.safetyStock, input.status, actorId, now]); const sources = await getInventorySources(); const result = sources.find((source) => source.id === id); if (!result) throw new DomainError("The inventory source could not be loaded after saving.", 500); return result; }
