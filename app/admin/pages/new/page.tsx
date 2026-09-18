import type { Metadata } from "next";
import { PageBuilder } from "@/components/page-builder";
import { getForms } from "@/lib/forms";
import { getNavigationMenus } from "@/lib/navigation";
import { getServiceLocations } from "@/lib/service-locations";
import { getActiveSiteTemplate } from "@/lib/templates";

export const metadata: Metadata = { title: "New page", robots: { index: false, follow: false } };

export default async function NewPagePage() {
  const [navigationMenus, forms, locations, headerTemplate, footerTemplate] = await Promise.all([getNavigationMenus(), getForms({ status: "published" }), getServiceLocations({ includeUnpublished: true }), getActiveSiteTemplate("header"), getActiveSiteTemplate("footer")]);
  return <div className="content-width"><PageBuilder headerTemplate={headerTemplate} footerTemplate={footerTemplate} navigationMenus={navigationMenus} forms={forms} locations={locations} /></div>;
}
