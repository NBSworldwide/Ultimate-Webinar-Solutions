"use client";

import { Archive, ExternalLink, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ContentPage } from "@/lib/types";

export function PageRowActions({ page }: { page: ContentPage }) {
  const router = useRouter();
  async function changeStatus(status: "archived") {
    const response = await fetch(`/api/admin/pages/${encodeURIComponent(page.id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug: page.slug, title: page.title, excerpt: page.excerpt, status, blocks: page.blocks, seoTitle: page.seoTitle, seoDescription: page.seoDescription }) });
    if (!response.ok) { const data = await response.json() as { error?: string }; window.alert(data.error ?? "The page could not be archived."); return; }
    router.refresh();
  }
  async function remove() {
    if (!window.confirm("Permanently delete this archived page? This cannot be undone.")) return;
    const response = await fetch(`/api/admin/pages/${encodeURIComponent(page.id)}`, { method: "DELETE" });
    if (!response.ok) { const data = await response.json() as { error?: string }; window.alert(data.error ?? "The page could not be deleted."); return; }
    router.refresh();
  }
  return <div className="page-row-actions"><Link className="button button-secondary button-small" href={`/admin/pages/${page.id}/edit`}><Pencil size={13} /> Edit</Link>{page.status === "published" ? <Link className="button button-secondary button-small" href={`/pages/${page.slug}`} target="_blank" rel="noreferrer"><ExternalLink size={13} /> View</Link> : null}{page.status !== "archived" ? <button type="button" className="button button-secondary button-small" onClick={() => void changeStatus("archived")}><Archive size={13} /> Archive</button> : <button type="button" className="button button-secondary button-small button-danger" onClick={() => void remove()}><Trash2 size={13} /> Delete</button>}</div>;
}
