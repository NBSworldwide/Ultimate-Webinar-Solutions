import type { Metadata } from "next";
import { NewPageDialog } from "@/components/new-page-dialog";

export const metadata: Metadata = { title: "New page", robots: { index: false, follow: false } };

export default async function NewPagePage() {
  return <NewPageDialog />;
}
