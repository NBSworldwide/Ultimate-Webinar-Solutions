import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FormBuilder } from "@/components/form-builder";
import { getFormById } from "@/lib/forms";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Edit form", robots: { index: false, follow: false } };

export default async function EditFormPage({ params }: { params: Promise<{ id: string }> }) {
  const form = await getFormById((await params).id);
  if (!form) notFound();
  return <div className="content-width"><FormBuilder form={form} /></div>;
}
