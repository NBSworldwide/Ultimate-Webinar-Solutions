import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ServiceLocationForm } from "@/components/service-location-form";
import { getServiceLocationById } from "@/lib/service-locations";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Edit service location", robots: { index: false, follow: false } };

export default async function EditServiceLocationPage({ params }: { params: Promise<{ id: string }> }) {
  const location = await getServiceLocationById((await params).id, { includeUnpublished: true });
  if (!location) notFound();
  return <div className="content-width"><ServiceLocationForm location={location} /></div>;
}
