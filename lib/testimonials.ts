import { randomUUID } from "node:crypto";
import { assertStandaloneDataset, getDb, type DatabaseRow } from "@/lib/db";
import { DomainError } from "@/lib/errors";
import type { TestimonialView } from "@/lib/types";

type TestimonialRow = DatabaseRow & { id: string; customer_name: string; quote: string; rating: number | string; source: string; product_name: string | null; created_at: string };
function view(row: TestimonialRow): TestimonialView { return { id: row.id, customerName: row.customer_name, quote: row.quote, rating: Number(row.rating), source: row.source, productName: row.product_name, createdAt: row.created_at }; }

export async function getApprovedTestimonials(limit = 12): Promise<TestimonialView[]> {
  await assertStandaloneDataset();
  const { rows } = await getDb().query<TestimonialRow>("SELECT t.id,t.customer_name,t.quote,t.rating,t.source,p.name AS product_name,t.created_at FROM testimonials t LEFT JOIN products p ON p.id=t.product_id WHERE t.status='approved' AND t.verified=true ORDER BY t.created_at DESC LIMIT $1", [Math.min(24, Math.max(1, limit))]);
  return rows.map(view);
}

export async function submitTestimonial(input: { customerName: string; customerEmail: string; quote: string; rating: number; productId?: string | null }): Promise<void> {
  await assertStandaloneDataset();
  if (!input.customerName.trim() || !/^\S+@\S+\.\S+$/.test(input.customerEmail.trim())) throw new DomainError("Enter your name and a valid customer email.");
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) throw new DomainError("Choose a rating from one to five.");
  if (input.quote.trim().length < 20 || input.quote.trim().length > 1000) throw new DomainError("Your testimonial must be between twenty and one thousand characters.");
  const email = input.customerEmail.trim().toLowerCase();
  const verified = await getDb().query("SELECT 1 FROM orders WHERE customer_email=$1 AND payment_status='paid' UNION SELECT 1 FROM registrations WHERE customer_email=$1 AND payment_status IN ('paid','free') LIMIT 1", [email]);
  if (verified.rows.length === 0) throw new DomainError("Testimonials are available after a completed purchase or registration.", 403);
  await getDb().query("INSERT INTO testimonials (id,customer_name,customer_email,quote,rating,product_id,verified,status,created_at) VALUES ($1,$2,$3,$4,$5,$6,true,'pending',$7)", [randomUUID(), input.customerName.trim(), email, input.quote.trim(), input.rating, input.productId ?? null, new Date().toISOString()]);
}
