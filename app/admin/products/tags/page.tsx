import type { Metadata } from "next";
import { CatalogTaxonomyManager } from "@/components/catalog-taxonomy-manager";
import { getTaxonomyEntries } from "@/lib/product-taxonomy";
export const metadata: Metadata = { title: "Product tags", robots: { index: false, follow: false } };
export default async function TagsPage() { return <CatalogTaxonomyManager kind="tags" title="Tags" description="Add lightweight labels for search, merchandising, and page-builder filters." initialEntries={await getTaxonomyEntries("tags")} />; }
