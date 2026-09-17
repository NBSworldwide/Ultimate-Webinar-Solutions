import type { Metadata } from "next";
import { CatalogTaxonomyManager } from "@/components/catalog-taxonomy-manager";
import { getTaxonomyEntries } from "@/lib/product-taxonomy";
export const metadata: Metadata = { title: "Product brands", robots: { index: false, follow: false } };
export default async function BrandsPage() { return <CatalogTaxonomyManager kind="brands" title="Brands" description="Manage brand names used to organize and filter the catalog." initialEntries={await getTaxonomyEntries("brands")} />; }
