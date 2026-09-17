import type { Metadata } from "next";
import { PageBuilder } from "@/components/page-builder";
import { getNavigationMenus } from "@/lib/navigation";

export const metadata: Metadata = { title: "New page", robots: { index: false, follow: false } };

export default async function NewPagePage() {
  const navigationMenus = await getNavigationMenus();
  return <div className="content-width"><PageBuilder navigationMenus={navigationMenus} /></div>;
}
