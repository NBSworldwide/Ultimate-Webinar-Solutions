import type { Metadata } from "next";
import { getInventorySources } from "@/lib/catalog";
import { InventorySourceManager } from "@/components/inventory-source-manager";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Inventory sources", robots: { index: false, follow: false } };
export default async function InventoryPage() { return <div className="content-width"><div className="page-topline"><div><span className="eyebrow">Commerce integrations</span><h1 className="page-title">Inventory sources.</h1><p className="page-subtitle">Connect a local, external, or hybrid inventory source. SKU mappings and provider credentials stay separate from the product catalog.</p></div></div><InventorySourceManager sources={await getInventorySources()} /></div>; }
