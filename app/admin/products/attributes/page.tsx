import type { Metadata } from "next";
import { CatalogTaxonomyManager } from "@/components/catalog-taxonomy-manager";
import { getTaxonomyEntries } from "@/lib/product-taxonomy";
export const metadata: Metadata = { title: "Product attributes", robots: { index: false, follow: false } };
export default async function AttributesPage() { return <CatalogTaxonomyManager kind="attributes" title="Attributes" description="Define selectable options such as color, size, bundle, or format for variants." initialEntries={await getTaxonomyEntries("attributes")} />; }
