import type { Metadata } from "next";
import { PageBuilder } from "@/components/page-builder";
import { getForms } from "@/lib/forms";
import { getNavigationMenus } from "@/lib/navigation";
import { getServiceLocations } from "@/lib/service-locations";

export const metadata: Metadata = { title: "New page", robots: { index: false, follow: false } };

export default async function NewPagePage() {
  const [navigationMenus, forms, locations] = await Promise.all([getNavigationMenus(), getForms({ status: "published" }), getServiceLocations({ includeUnpublished: true })]);
  return <div className="content-width"><PageBuilder navigationMenus={navigationMenus} forms={forms} locations={locations} /></div>;
}
