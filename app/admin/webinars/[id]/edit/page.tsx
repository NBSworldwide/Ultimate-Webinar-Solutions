import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WebinarForm } from "@/components/webinar-form";
import { getWebinarById } from "@/lib/data";
import { getSiteSettings } from "@/lib/site-settings";
import { getProducts } from "@/lib/commerce";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Edit webinar" };

export default async function EditWebinarPage({ params }: { params: Promise<{ id: string }> }) {
  const [webinar, settings, products] = await Promise.all([getWebinarById((await params).id), getSiteSettings(), getProducts(false)]);
  if (!webinar) notFound();
  return <div className="content-width"><div className="page-topline"><div><span className="eyebrow">Program management</span><h1 className="page-title">Edit webinar.</h1><p className="page-subtitle">Update the content and setup without changing its public URL or existing registration history.</p></div></div><WebinarForm webinar={webinar} products={products} defaultTimezone={settings.timezone} /></div>;
}
