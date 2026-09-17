import type { Metadata } from "next";
import { PageBuilder } from "@/components/page-builder";

export const metadata: Metadata = { title: "New page", robots: { index: false, follow: false } };

export default function NewPagePage() { return <div className="content-width"><PageBuilder /></div>; }
