import { randomUUID } from "node:crypto";
import { assertStandaloneDataset, getDb, isDemoMode, type DatabaseClient, type DatabaseRow } from "@/lib/db";
import { DomainError } from "@/lib/errors";
import { upsertCrmContact } from "@/lib/crm";
import { queueCorrespondence, scheduleCorrespondenceSequence } from "@/lib/email";
import { getProductVariants } from "@/lib/catalog";
import type { FulfillmentStatus, OrderItemView, OrderView, ProductListItem, ProductPaymentStatus, ProductStatus } from "@/lib/types";

export { DomainError } from "@/lib/errors";

type ProductRow = {
  id: string;
  slug: string;
  name: string;
  sku: string;
  description: string;
  details: string;
  category: string;
  image_url: string | null;
  price_cents: number | string;
  compare_at_price_cents: number | string | null;
  sale_price_cents: number | string | null;
  sale_starts_at: string | null;
  sale_ends_at: string | null;
  inventory_quantity: number | string;
  weight_grams: number | string;
  status: ProductStatus;
};

function saleIsActive(row: Pick<ProductRow, "sale_price_cents" | "sale_starts_at" | "sale_ends_at">, now = new Date()): boolean {
  if (row.sale_price_cents === null) return false;
  const timestamp = now.getTime();
  if (row.sale_starts_at && new Date(row.sale_starts_at).getTime() > timestamp) return false;
  if (row.sale_ends_at && new Date(row.sale_ends_at).getTime() <= timestamp) return false;
  return true;
}

function toProduct(row: ProductRow): ProductListItem & { details: string } {
  const regularPriceCents = Number(row.price_cents);
  const salePriceCents = row.sale_price_cents === null ? null : Number(row.sale_price_cents);
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    sku: row.sku,
    description: row.description,
    details: row.details,
    category: row.category,
    imageUrl: row.image_url,
    priceCents: saleIsActive(row) ? salePriceCents as number : regularPriceCents,
    inventoryQuantity: Number(row.inventory_quantity),
    weightGrams: Number(row.weight_grams),
    status: row.status,
    compareAtPriceCents: row.compare_at_price_cents === null ? null : Number(row.compare_at_price_cents),
    salePriceCents,
    saleStartsAt: row.sale_starts_at,
    saleEndsAt: row.sale_ends_at,
  };
}

const productFields = "id, slug, name, sku, description, details, category, image_url, price_cents, compare_at_price_cents, sale_price_cents, sale_starts_at, sale_ends_at, inventory_quantity, weight_grams, status";

export async function getProducts(activeOnly = true, filters?: { query?: string; status?: ProductStatus | "all" }): Promise<Array<ProductListItem & { details: string }>> {
  await assertStandaloneDataset();
  const values: unknown[] = [];
  const conditions = activeOnly ? ["status = 'active'"] : [];
  const query = filters?.query?.trim();
  if (query) {
    values.push(`%${query}%`);
    conditions.push(`(name ILIKE $${values.length} OR sku ILIKE $${values.length} OR category ILIKE $${values.length})`);
  }
  if (!activeOnly && filters?.status && filters.status !== "all") {
    values.push(filters.status);
    conditions.push(`status = $${values.length}`);
  }
  const filter = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const { rows } = await getDb().query<ProductRow>(`SELECT ${productFields} FROM products ${filter} ORDER BY category ASC, name ASC`, values);
  return rows.map(toProduct);
}

export async function getProductBySlug(slug: string, activeOnly = true): Promise<(ProductListItem & { details: string }) | null> {
  await assertStandaloneDataset();
  const filter = activeOnly ? "AND status = 'active'" : "";
  const { rows } = await getDb().query<ProductRow>(`SELECT ${productFields} FROM products WHERE slug = $1 ${filter}`, [slug]);
  if (!rows[0]) return null;
  const product = toProduct(rows[0]);
  product.variants = await getProductVariants(product.id, activeOnly);
  return product;
}

export interface CreateProductInput {
  name: string;
  sku: string;
  description: string;
  details: string;
  category: string;
  priceCents: number;
  inventoryQuantity: number;
  weightGrams: number;
  status: ProductStatus;
  compareAtPriceCents?: number | null;
  salePriceCents?: number | null;
  saleStartsAt?: string | null;
  saleEndsAt?: string | null;
}

function validateSalePricing(input: CreateProductInput): void {
  if (input.compareAtPriceCents !== undefined && input.compareAtPriceCents !== null) {
    if (!Number.isInteger(input.compareAtPriceCents) || input.compareAtPriceCents < input.priceCents) {
      throw new DomainError("Compare-at price must be greater than or equal to the regular price.");
    }
  }
  if (input.salePriceCents !== undefined && input.salePriceCents !== null) {
    if (!Number.isInteger(input.salePriceCents) || input.salePriceCents < 0 || input.salePriceCents >= input.priceCents) {
      throw new DomainError("Sale price must be lower than the regular price.");
    }
    if (input.saleStartsAt && input.saleEndsAt && new Date(input.saleEndsAt).getTime() <= new Date(input.saleStartsAt).getTime()) {
      throw new DomainError("Sale end must be after sale start.");
    }
  }
}

function productSlug(value: string): string {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70) || `product-${Date.now()}`;
}

export async function createProduct(input: CreateProductInput, actorId: string): Promise<ProductListItem & { details: string }> {
  if (!input.name.trim() || !input.sku.trim()) throw new DomainError("Product name and SKU are required.");
  if (!Number.isInteger(input.priceCents) || input.priceCents < 0) throw new DomainError("Enter a valid product price.");
  if (!Number.isInteger(input.inventoryQuantity) || input.inventoryQuantity < 0) throw new DomainError("Enter a valid inventory quantity.");
  if (!Number.isInteger(input.weightGrams) || input.weightGrams < 0) throw new DomainError("Enter a valid product weight.");
  validateSalePricing(input);

  const id = `product-${randomUUID()}`;
  const now = new Date().toISOString();
  return withCommerceTransaction(async (client) => {
    let slug = productSlug(input.name);
    const existing = await client.query("SELECT id FROM products WHERE slug = $1 OR sku = $2", [slug, input.sku.trim()]);
    if (existing.rows.length > 0) slug = `${slug}-${randomUUID().slice(0, 6)}`;
    await client.query(`
      INSERT INTO products (id, slug, name, sku, description, details, category, price_cents, compare_at_price_cents, sale_price_cents, sale_starts_at, sale_ends_at, inventory_quantity, weight_grams, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $16)
    `, [id, slug, input.name.trim(), input.sku.trim().toUpperCase(), input.description.trim(), input.details.trim(), input.category.trim(), input.priceCents, input.compareAtPriceCents ?? null, input.salePriceCents ?? null, input.saleStartsAt ?? null, input.saleEndsAt ?? null, input.inventoryQuantity, input.weightGrams, input.status, now]);
    await client.query(`
      INSERT INTO audit_events (id, actor_id, event_type, entity_type, entity_id, metadata_json, created_at)
      VALUES ($1, $2, 'product.created', 'product', $3, $4, $5)
    `, [randomUUID(), actorId, id, JSON.stringify({ sku: input.sku.trim().toUpperCase(), synthetic: true }), now]);
    const result = await client.query<ProductRow>(`SELECT ${productFields} FROM products WHERE id = $1`, [id]);
    if (!result.rows[0]) throw new DomainError("The product was created but could not be loaded.", 500);
    return toProduct(result.rows[0]);
  });
}

export async function updateProduct(id: string, input: CreateProductInput, actorId: string): Promise<ProductListItem & { details: string }> {
  if (!input.name.trim() || !input.sku.trim()) throw new DomainError("Product name and SKU are required.");
  if (!Number.isInteger(input.priceCents) || input.priceCents < 0) throw new DomainError("Enter a valid product price.");
  if (!Number.isInteger(input.inventoryQuantity) || input.inventoryQuantity < 0) throw new DomainError("Enter a valid inventory quantity.");
  if (!Number.isInteger(input.weightGrams) || input.weightGrams < 0) throw new DomainError("Enter a valid product weight.");
  validateSalePricing(input);

  const now = new Date().toISOString();
  return withCommerceTransaction(async (client) => {
    const existing = await client.query<{ id: string; slug: string }>("SELECT id, slug FROM products WHERE id = $1 FOR UPDATE", [id]);
    if (!existing.rows[0]) throw new DomainError("The product could not be found.", 404);
    const duplicate = await client.query("SELECT id FROM products WHERE (sku = $1 OR name = $2) AND id <> $3", [input.sku.trim().toUpperCase(), input.name.trim(), id]);
    if (duplicate.rows.length > 0) throw new DomainError("Another product already uses that name or SKU.", 409);
    await client.query(`
      UPDATE products
      SET name = $2, sku = $3, description = $4, details = $5, category = $6,
          price_cents = $7, compare_at_price_cents = $8, sale_price_cents = $9,
          sale_starts_at = $10, sale_ends_at = $11, inventory_quantity = $12,
          weight_grams = $13, status = $14, updated_at = $15
      WHERE id = $1
    `, [id, input.name.trim(), input.sku.trim().toUpperCase(), input.description.trim(), input.details.trim(), input.category.trim(), input.priceCents, input.compareAtPriceCents ?? null, input.salePriceCents ?? null, input.saleStartsAt ?? null, input.saleEndsAt ?? null, input.inventoryQuantity, input.weightGrams, input.status, now]);
    await client.query(`
      INSERT INTO audit_events (id, actor_id, event_type, entity_type, entity_id, metadata_json, created_at)
      VALUES ($1, $2, 'product.updated', 'product', $3, $4, $5)
    `, [randomUUID(), actorId, id, JSON.stringify({ sku: input.sku.trim().toUpperCase(), synthetic: true }), now]);
    const result = await client.query<ProductRow>(`SELECT ${productFields} FROM products WHERE id = $1`, [id]);
    if (!result.rows[0]) throw new DomainError("The product was updated but could not be loaded.", 500);
    return toProduct(result.rows[0]);
  });
}

type OrderRow = {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  shipping_name: string;
  shipping_address_line1: string;
  shipping_address_line2: string;
  shipping_city: string;
  shipping_region: string;
  shipping_postal_code: string;
  shipping_country: string;
  subtotal_cents: number | string;
  shipping_cents: number | string;
  total_cents: number | string;
  payment_status: ProductPaymentStatus;
  fulfillment_status: FulfillmentStatus;
  tracking_carrier: string | null;
  tracking_number: string | null;
  item_id: string | null;
  product_id: string | null;
  variant_id: string | null;
  variant_name: string | null;
  product_name: string | null;
  sku: string | null;
  quantity: number | string | null;
  unit_price_cents: number | string | null;
  line_total_cents: number | string | null;
  created_at: string;
  updated_at: string;
};

function toOrder(rows: OrderRow[]): OrderView | null {
  const first = rows[0];
  if (!first) return null;
  const items: OrderItemView[] = rows.filter((row) => row.item_id && row.product_id).map((row) => ({
    id: row.item_id as string,
    productId: row.product_id as string,
    variantId: row.variant_id,
    variantName: row.variant_name,
    productName: row.product_name as string,
    sku: row.sku as string,
    quantity: Number(row.quantity),
    unitPriceCents: Number(row.unit_price_cents),
    lineTotalCents: Number(row.line_total_cents),
  }));
  return {
    id: first.id,
    orderNumber: first.order_number,
    customerName: first.customer_name,
    customerEmail: first.customer_email,
    customerPhone: first.customer_phone,
    shippingName: first.shipping_name,
    shippingAddressLine1: first.shipping_address_line1,
    shippingAddressLine2: first.shipping_address_line2,
    shippingCity: first.shipping_city,
    shippingRegion: first.shipping_region,
    shippingPostalCode: first.shipping_postal_code,
    shippingCountry: first.shipping_country,
    subtotalCents: Number(first.subtotal_cents),
    shippingCents: Number(first.shipping_cents),
    totalCents: Number(first.total_cents),
    paymentStatus: first.payment_status,
    fulfillmentStatus: first.fulfillment_status,
    trackingCarrier: first.tracking_carrier,
    trackingNumber: first.tracking_number,
    items,
    createdAt: first.created_at,
    updatedAt: first.updated_at,
  };
}

const orderFields = `o.id, o.order_number, o.customer_name, o.customer_email, o.customer_phone,
  o.shipping_name, o.shipping_address_line1, o.shipping_address_line2, o.shipping_city,
  o.shipping_region, o.shipping_postal_code, o.shipping_country, o.subtotal_cents,
  o.shipping_cents, o.total_cents, o.payment_status, o.fulfillment_status,
  o.tracking_carrier, o.tracking_number, o.created_at, o.updated_at,
  oi.id AS item_id, oi.product_id, oi.variant_id, oi.variant_name, oi.product_name, oi.sku, oi.quantity,
  oi.unit_price_cents, oi.line_total_cents`;

export async function getOrderById(id: string): Promise<OrderView | null> {
  await assertStandaloneDataset();
  const { rows } = await getDb().query<OrderRow>(`SELECT ${orderFields} FROM orders o LEFT JOIN order_items oi ON oi.order_id = o.id WHERE o.id = $1 ORDER BY oi.id`, [id]);
  return toOrder(rows);
}

export async function getOrders(filters?: { query?: string; paymentStatus?: ProductPaymentStatus | "all"; fulfillmentStatus?: FulfillmentStatus | "all" }): Promise<OrderView[]> {
  await assertStandaloneDataset();
  const values: unknown[] = [];
  const conditions: string[] = [];
  const query = filters?.query?.trim();
  if (query) {
    values.push(`%${query}%`);
    conditions.push(`(o.order_number ILIKE $${values.length} OR o.customer_name ILIKE $${values.length} OR o.customer_email ILIKE $${values.length})`);
  }
  if (filters?.paymentStatus && filters.paymentStatus !== "all") {
    values.push(filters.paymentStatus);
    conditions.push(`o.payment_status = $${values.length}`);
  }
  if (filters?.fulfillmentStatus && filters.fulfillmentStatus !== "all") {
    values.push(filters.fulfillmentStatus);
    conditions.push(`o.fulfillment_status = $${values.length}`);
  }
  const where = conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : "";
  const { rows } = await getDb().query<OrderRow>(`SELECT ${orderFields} FROM orders o LEFT JOIN order_items oi ON oi.order_id = o.id${where} ORDER BY o.created_at DESC, oi.id ASC`, values);
  const grouped = new Map<string, OrderRow[]>();
  for (const row of rows) grouped.set(row.id, [...(grouped.get(row.id) ?? []), row]);
  return [...grouped.values()].map(toOrder).filter((order): order is OrderView => Boolean(order));
}

export interface ProductOrderInput {
  items: Array<{ productId: string; variantId?: string | null; quantity: number }>;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingName: string;
  shippingAddressLine1: string;
  shippingAddressLine2?: string;
  shippingCity: string;
  shippingRegion: string;
  shippingPostalCode: string;
  shippingCountry?: string;
}

export async function createProductOrder(input: ProductOrderInput): Promise<OrderView> {
  if (!isDemoMode()) throw new DomainError("Payment processing is not configured for this release.", 503);
  const items = [...new Map(input.items.map((item) => [`${item.productId}:${item.variantId ?? "base"}`, item])).values()];
  if (items.length === 0 || items.length > 20) throw new DomainError("Choose between one and twenty products.");
  if (items.some((item) => !item.productId || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 25)) throw new DomainError("Each product quantity must be between one and twenty-five.");
  const required = [input.customerName, input.customerEmail, input.customerPhone, input.shippingName, input.shippingAddressLine1, input.shippingCity, input.shippingRegion, input.shippingPostalCode];
  if (required.some((value) => !value?.trim())) throw new DomainError("Complete the customer and shipping details.");
  if (!/^\S+@\S+\.\S+$/.test(input.customerEmail.trim())) throw new DomainError("Enter a valid customer email.");

  const orderId = `order-${randomUUID()}`;
  const orderNumber = `WS-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${randomUUID().slice(0, 6).toUpperCase()}`;
  const now = new Date().toISOString();
  await withCommerceTransaction(async (client) => {
    const lineItems: Array<{ product: ProductRow; variantId: string | null; variantName: string | null; sku: string; unitPriceCents: number; quantity: number; lineTotalCents: number }> = [];
    for (const item of items) {
      const result = await client.query<ProductRow>(`SELECT ${productFields} FROM products WHERE id = $1 AND status = 'active' FOR UPDATE`, [item.productId]);
      const product = result.rows[0];
      if (!product) throw new DomainError("One of the selected products is no longer available.", 409);
      let sku = product.sku;
      let unitPriceCents = saleIsActive(product) ? Number(product.sale_price_cents) : Number(product.price_cents);
      let variantName: string | null = null;
      if (item.variantId) {
        const variantResult = await client.query<DatabaseRow & { id: string; name: string; sku: string; price_cents: number | string; sale_price_cents: number | string | null; sale_starts_at: string | null; sale_ends_at: string | null; inventory_quantity: number | string }>("SELECT * FROM product_variants WHERE id = $1 AND product_id = $2 AND status = 'active' FOR UPDATE", [item.variantId, item.productId]);
        const variant = variantResult.rows[0];
        if (!variant) throw new DomainError("One of the selected product variants is no longer available.", 409);
        sku = variant.sku;
        variantName = variant.name;
        const variantSaleActive = variant.sale_price_cents !== null && (!variant.sale_starts_at || new Date(variant.sale_starts_at).getTime() <= Date.now()) && (!variant.sale_ends_at || new Date(variant.sale_ends_at).getTime() > Date.now());
        unitPriceCents = variantSaleActive ? Number(variant.sale_price_cents) : Number(variant.price_cents);
        const inventory = Number(variant.inventory_quantity);
        if (inventory < item.quantity) throw new DomainError(`${product.name} — ${variant.name} has only ${inventory} left in stock.`, 409);
        await client.query("UPDATE product_variants SET inventory_quantity = inventory_quantity - $1, updated_at = $2 WHERE id = $3", [item.quantity, now, variant.id]);
      } else {
        const inventory = Number(product.inventory_quantity);
        if (inventory < item.quantity) throw new DomainError(`${product.name} has only ${inventory} left in stock.`, 409);
        await client.query("UPDATE products SET inventory_quantity = inventory_quantity - $1, updated_at = $2 WHERE id = $3", [item.quantity, now, product.id]);
      }
      lineItems.push({ product, variantId: item.variantId ?? null, variantName, sku, unitPriceCents, quantity: item.quantity, lineTotalCents: unitPriceCents * item.quantity });
    }
    const subtotalCents = lineItems.reduce((sum, item) => sum + item.lineTotalCents, 0);
    const shippingCents = subtotalCents >= 7_500 ? 0 : 995;
    await client.query(`
      INSERT INTO orders (id, order_number, customer_name, customer_email, customer_phone,
        shipping_name, shipping_address_line1, shipping_address_line2, shipping_city,
        shipping_region, shipping_postal_code, shipping_country, subtotal_cents,
        shipping_cents, total_cents, payment_status, fulfillment_status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'paid', 'unfulfilled', $16, $16)
    `, [orderId, orderNumber, input.customerName.trim(), input.customerEmail.trim().toLowerCase(), input.customerPhone.trim(), input.shippingName.trim(), input.shippingAddressLine1.trim(), input.shippingAddressLine2?.trim() ?? "", input.shippingCity.trim(), input.shippingRegion.trim(), input.shippingPostalCode.trim(), input.shippingCountry?.trim().toUpperCase() || "US", subtotalCents, shippingCents, subtotalCents + shippingCents, now]);
    for (const item of lineItems) {
      await client.query(`
        INSERT INTO order_items (id, order_id, product_id, variant_id, variant_name, product_name, sku, quantity, unit_price_cents, line_total_cents)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [randomUUID(), orderId, item.product.id, item.variantId, item.variantName, item.product.name, item.sku, item.quantity, item.unitPriceCents, item.lineTotalCents]);
    }
    const contactId = await upsertCrmContact({ email: input.customerEmail, name: input.customerName, phone: input.customerPhone, source: "order", lifecycleStage: "customer" }, null, client);
    await client.query("INSERT INTO crm_activities (id, contact_id, activity_type, subject, body, entity_type, entity_id, occurred_at) VALUES ($1, $2, 'order', $3, $4, 'order', $5, $6)", [randomUUID(), contactId, `Order ${orderNumber} created`, `Total: ${subtotalCents + shippingCents} cents`, orderId, now]);
    await scheduleCorrespondenceSequence({ client, triggerKey: "order.created", recipientEmail: input.customerEmail, recipientName: input.customerName, entityType: "order", entityId: orderId, payload: { customer_name: input.customerName, order_number: orderNumber, order_total: `$${((subtotalCents + shippingCents) / 100).toFixed(2)}` } });
    await client.query(`
      INSERT INTO audit_events (id, actor_id, event_type, entity_type, entity_id, metadata_json, created_at)
      VALUES ($1, NULL, 'order.created', 'order', $2, $3, $4)
    `, [randomUUID(), orderId, JSON.stringify({ orderNumber, itemCount: lineItems.length, synthetic: true, paymentProvider: "demo" }), now]);
  });
  const order = await getOrderById(orderId);
  if (!order) throw new DomainError("The order was created but could not be loaded.", 500);
  return order;
}

export async function updateOrderFulfillment(orderId: string, status: FulfillmentStatus, trackingCarrier: string | null, trackingNumber: string | null, actorId: string): Promise<OrderView> {
  if (!["unfulfilled", "packing", "shipped", "delivered", "cancelled"].includes(status)) throw new DomainError("Choose a valid fulfillment status.");
  const now = new Date().toISOString();
  await withCommerceTransaction(async (client) => {
    const updated = await client.query("UPDATE orders SET fulfillment_status = $1, tracking_carrier = $2, tracking_number = $3, updated_at = $4 WHERE id = $5 RETURNING id", [status, trackingCarrier?.trim() || null, trackingNumber?.trim() || null, now, orderId]);
    if (!updated.rows[0]) throw new DomainError("The order could not be found.", 404);
    if (status === "shipped") {
      const orderResult = await client.query<{ customer_name: string; customer_email: string; order_number: string }>("SELECT customer_name, customer_email, order_number FROM orders WHERE id = $1", [orderId]);
      const shipped = orderResult.rows[0];
      if (shipped) await queueCorrespondence({ client, templateSlug: "shipment-confirmed", triggerKey: "order.shipped", recipientEmail: shipped.customer_email, recipientName: shipped.customer_name, entityType: "order", entityId: orderId, idempotencyKey: `${orderId}:shipment-confirmed:${trackingNumber?.trim() ?? "none"}`, payload: { customer_name: shipped.customer_name, order_number: shipped.order_number, tracking_carrier: trackingCarrier?.trim() ?? "", tracking_number: trackingNumber?.trim() ?? "" } });
    }
    await client.query(`INSERT INTO audit_events (id, actor_id, event_type, entity_type, entity_id, metadata_json, created_at) VALUES ($1, $2, 'order.fulfillment_updated', 'order', $3, $4, $5)`, [randomUUID(), actorId, orderId, JSON.stringify({ status, synthetic: true }), now]);
  });
  const order = await getOrderById(orderId);
  if (!order) throw new DomainError("The order could not be loaded after updating.", 500);
  return order;
}

async function withCommerceTransaction<T>(work: (client: DatabaseClient) => Promise<T>): Promise<T> {
  await assertStandaloneDataset();
  const client = await getDb().connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
