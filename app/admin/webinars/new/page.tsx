import type { Metadata } from "next";
import { WebinarForm } from "@/components/webinar-form";
import { webinarTemplates } from "@/lib/playbooks";
import { getSiteSettings } from "@/lib/site-settings";
import { getProducts } from "@/lib/commerce";

export const metadata: Metadata = { title: "New webinar" };

export default async function NewWebinarPage({ searchParams }: { searchParams: Promise<{ template?: string }> }) {
  const params = await searchParams;
  const template = webinarTemplates.find((item) => item.id === params.template);
  const [settings, products] = await Promise.all([getSiteSettings(), getProducts(false)]);
  return <div className="content-width"><div className="page-topline"><div><span className="eyebrow">Program management</span><h1 className="page-title">{template ? `Create from ${template.name}.` : "Create a webinar."}</h1><p className="page-subtitle">{template ? "The playbook has prefilled the starting shape. Review it, add the host and time, then save it as a draft or publish it." : "Start with the session details and a primary seat tier. Add more tiers in the next release."}</p></div></div><WebinarForm template={template} products={products} defaultTimezone={settings.timezone} /></div>;
}
