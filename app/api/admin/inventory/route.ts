import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { createInventorySource, getInventorySources } from "@/lib/catalog";
import { DomainError } from "@/lib/errors";
import { assertSameOrigin, RequestSecurityError } from "@/lib/request-security";
const schema = z.object({ name: z.string().trim().min(2).max(120), sourceType: z.enum(["shopify", "square", "cin7", "custom_api"]), baseUrl: z.string().url().or(z.literal("")), syncMode: z.enum(["local", "external", "hybrid"]), safetyStock: z.number().int().min(0).max(100000), status: z.enum(["draft", "active", "paused", "error"]) });
export async function GET() { const user = await getCurrentUser(); if (!user || user.role !== "admin") return NextResponse.json({ error: "Admin access is required." }, { status: 401 }); try { return NextResponse.json({ sources: await getInventorySources() }); } catch { return NextResponse.json({ error: "Inventory sources could not be loaded." }, { status: 500 }); } }
export async function POST(request: Request) { const user = await getCurrentUser(); if (!user || user.role !== "admin") return NextResponse.json({ error: "Admin access is required." }, { status: 401 }); try { assertSameOrigin(request); const source = await createInventorySource(schema.parse(await request.json()), user.id); revalidatePath("/admin/inventory"); return NextResponse.json({ source }, { status: 201 }); } catch (error) { if (error instanceof z.ZodError) return NextResponse.json({ error: "Complete the inventory source fields." }, { status: 400 }); if (error instanceof DomainError) return NextResponse.json({ error: error.message }, { status: error.statusCode }); if (error instanceof RequestSecurityError) return NextResponse.json({ error: error.message }, { status: 403 }); return NextResponse.json({ error: "The inventory source could not be saved." }, { status: 500 }); } }
