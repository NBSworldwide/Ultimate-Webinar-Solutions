import type { Metadata } from "next";
import { CatalogTaxonomyManager } from "@/components/catalog-taxonomy-manager";
import { getTaxonomyEntries } from "@/lib/product-taxonomy";
export const metadata: Metadata = { title: "Product reviews", robots: { index: false, follow: false } };
export default async function ReviewsPage() { return <CatalogTaxonomyManager kind="reviews" title="Reviews" description="Review verified customer feedback before publishing it on product pages or testimonials blocks." initialEntries={await getTaxonomyEntries("reviews")} />; }
