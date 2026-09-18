import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageBuilder } from "@/components/page-builder";
import { getForms } from "@/lib/forms";
import { getNavigationMenus } from "@/lib/navigation";
import { getPageById } from "@/lib/pages";
import { getServiceLocations } from "@/lib/service-locations";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Edit page", robots: { index: false, follow: false } };

export default async function EditPagePage({ params }: { params: Promise<{ id: string }> }) {
  const [page, navigationMenus, forms, locations] = await Promise.all([getPageById((await params).id), getNavigationMenus(), getForms({ status: "published" }), getServiceLocations({ includeUnpublished: true })]);
  if (!page) notFound();
  return <div className="content-width"><PageBuilder page={page} navigationMenus={navigationMenus} forms={forms} locations={locations} /></div>;
}
