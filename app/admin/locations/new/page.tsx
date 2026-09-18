import type { Metadata } from "next";
import { ServiceLocationForm } from "@/components/service-location-form";

export const metadata: Metadata = { title: "New service location", robots: { index: false, follow: false } };

export default function NewServiceLocationPage() {
  return <div className="content-width"><ServiceLocationForm /></div>;
}
