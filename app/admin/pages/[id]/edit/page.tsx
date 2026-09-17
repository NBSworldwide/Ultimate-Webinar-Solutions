import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageBuilder } from "@/components/page-builder";
import { getPageById } from "@/lib/pages";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Edit page", robots: { index: false, follow: false } };

export default async function EditPagePage({ params }: { params: Promise<{ id: string }> }) {
  const page = await getPageById((await params).id);
  if (!page) notFound();
  return <div className="content-width"><PageBuilder page={page} /></div>;
}
