import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PageBuilder } from "@/components/page-builder";
import { getCurrentUser, hasCapability } from "@/lib/auth";
import { getForms } from "@/lib/forms";
import { getNavigationMenus } from "@/lib/navigation";
import { getSiteTemplateById, isSiteTemplateSchemaUnavailable } from "@/lib/templates";
import { getServiceLocations } from "@/lib/service-locations";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Edit site template", robots: { index: false, follow: false } };

async function loadTemplate(id: string) {
  try {
    return { template: await getSiteTemplateById(id), schemaUnavailable: false as const };
  } catch (error) {
    if (!isSiteTemplateSchemaUnavailable(error)) throw error;
    return { template: null, schemaUnavailable: true as const };
  }
}

export default async function EditSiteTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || !hasCapability(user, "appearance.manage")) redirect("/admin");
  const { id } = await params;
  const templateResult = await loadTemplate(id);
  if (templateResult.schemaUnavailable) return <div className="content-width"><section className="panel"><div className="panel-header"><div><span className="eyebrow">Migration required</span><h1 className="panel-title">Header &amp; Footer templates are not available yet.</h1><p className="row-meta">Apply migration <code>039_site_templates.sql</code> to the connected PostgreSQL database, then return to the template manager. Public pages continue to use the built-in fallback header and footer until the migration is applied.</p></div></div></section></div>;
  const [navigationMenus, forms, locations] = await Promise.all([getNavigationMenus(), getForms({ status: "published" }), getServiceLocations({ includeUnpublished: true })]);
  if (!templateResult.template) notFound();
  const template = templateResult.template;
  return <div className="content-width"><PageBuilder template={template} navigationMenus={navigationMenus} forms={forms} locations={locations} /></div>;
}
