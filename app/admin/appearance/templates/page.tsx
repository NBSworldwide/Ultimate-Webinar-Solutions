import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { TemplateManager } from "@/components/template-manager";
import { getCurrentUser, hasCapability } from "@/lib/auth";
import { getSiteTemplates, isSiteTemplateSchemaUnavailable } from "@/lib/templates";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Header & Footer templates", robots: { index: false, follow: false } };

async function loadTemplates() {
  try {
    return { templates: await getSiteTemplates(), schemaUnavailable: false as const };
  } catch (error) {
    if (!isSiteTemplateSchemaUnavailable(error)) throw error;
    return { templates: [], schemaUnavailable: true as const };
  }
}

export default async function TemplateManagerPage() {
  const user = await getCurrentUser();
  if (!user || !hasCapability(user, "appearance.manage")) redirect("/admin");
  const result = await loadTemplates();
  return <div className="content-width"><div className="page-topline"><div><span className="eyebrow">Workspace control</span><h1 className="page-title">Header &amp; Footer.</h1><p className="page-subtitle">Create reusable site shells, edit them on the live canvas, and choose the active template for each surface.</p></div></div>{result.schemaUnavailable ? <section className="panel"><div className="panel-header"><div><span className="eyebrow">Migration required</span><h2 className="panel-title">Template storage is not available yet.</h2><p className="row-meta">Apply migration <code>039_site_templates.sql</code> to the connected PostgreSQL database, then reload this page. Public pages continue to use the built-in fallback header and footer until the migration is applied.</p></div></div></section> : <TemplateManager initialTemplates={result.templates} />}</div>;
}
