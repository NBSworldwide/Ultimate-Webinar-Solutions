import type { Metadata } from "next";
import { FormBuilder } from "@/components/form-builder";

export const metadata: Metadata = { title: "New form", robots: { index: false, follow: false } };

export default function NewFormPage() {
  return <div className="content-width"><FormBuilder /></div>;
}
