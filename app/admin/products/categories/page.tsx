import type { Metadata } from "next";
import { CatalogTaxonomyManager } from "@/components/catalog-taxonomy-manager";
import { getTaxonomyEntries } from "@/lib/product-taxonomy";
export const metadata: Metadata = { title: "Product categories", robots: { index: false, follow: false } };
export default async function CategoriesPage() { return <CatalogTaxonomyManager kind="categories" title="Categories" description="Create nested collections for the product catalog and page-builder blocks." initialEntries={await getTaxonomyEntries("categories")} />; }
