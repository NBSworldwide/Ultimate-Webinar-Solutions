import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FormRenderer } from "@/components/form-renderer";
import { PublicFooter } from "@/components/public-footer";
import { PublicHeader } from "@/components/public-header";
import { getPublishedFormBySlug } from "@/lib/forms";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const form = await getPublishedFormBySlug((await params).slug);
  return form ? { title: form.name, description: form.description, robots: { index: false, follow: false } } : { title: "Form not found" };
}

export default async function PublicFormPage({ params }: { params: Promise<{ slug: string }> }) {
  const form = await getPublishedFormBySlug((await params).slug);
  if (!form) notFound();
  return <div className="public-shell"><PublicHeader /><main className="public-main" id="main-content"><section className="public-hero"><span className="eyebrow">Secure response</span><h1>{form.name}</h1>{form.description ? <p>{form.description}</p> : null}</section><FormRenderer form={form} /></main><PublicFooter /></div>;
}
