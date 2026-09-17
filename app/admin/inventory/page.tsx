import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getInventorySources } from "@/lib/catalog";
import { InventorySourceManager } from "@/components/inventory-source-manager";
import { getCurrentUser, hasCapability } from "@/lib/auth";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Inventory sources", robots: { index: false, follow: false } };
export default async function InventoryPage() { const user = await getCurrentUser(); if (!hasCapability(user, "inventory.manage")) redirect("/admin"); return <div className="content-width"><div className="page-topline"><div><span className="eyebrow">Commerce integrations</span><h1 className="page-title">Inventory sources.</h1><p className="page-subtitle">Connect a local, external, or hybrid inventory source. SKU mappings and provider credentials stay separate from the product catalog.</p></div></div><InventorySourceManager sources={await getInventorySources()} /></div>; }
