"use client";

import { Archive, ArchiveRestore, ExternalLink, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { ContentPage, PageStatus } from "@/lib/types";

function publicPath(page: ContentPage): string { return page.isHomepage ? "/" : page.slug === "service-locations" ? "/locations" : page.slug === "products" ? "/products" : page.slug.startsWith("location-") ? `/locations/${page.slug.slice("location-".length)}` : `/pages/${page.slug}`; }

type PageUpdate = {
  slug: string;
  title: string;
  excerpt: string;
  status: PageStatus;
  isHomepage: boolean;
  blocks: ContentPage["blocks"];
  seoTitle: string;
  seoDescription: string;
};

function pagePayload(page: ContentPage, overrides: Partial<PageUpdate> = {}): PageUpdate {
  return {
    slug: page.slug,
    title: page.title,
    excerpt: page.excerpt,
    status: page.status,
    isHomepage: page.isHomepage,
    blocks: page.blocks,
    seoTitle: page.seoTitle,
    seoDescription: page.seoDescription,
    ...overrides,
  };
}

function normalizeSlug(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 120);
}

export function PageRowActions({ page }: { page: ContentPage }) {
  const router = useRouter();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);
  const [changingHomepage, setChangingHomepage] = useState(false);
  const [homepageOverride, setHomepageOverride] = useState<boolean | null>(null);
  const [quickEditOpen, setQuickEditOpen] = useState(false);
  const [quickTitle, setQuickTitle] = useState(page.title);
  const [quickSlug, setQuickSlug] = useState(page.slug);
  const [quickStatus, setQuickStatus] = useState<PageStatus>(page.status);
  const [savingQuickEdit, setSavingQuickEdit] = useState(false);
  const [quickError, setQuickError] = useState("");
  const homepage = homepageOverride ?? page.isHomepage;

  function openQuickEdit() {
    setQuickTitle(page.title);
    setQuickSlug(page.slug);
    setQuickStatus(page.status);
    setQuickError("");
    setQuickEditOpen(true);
  }

  async function changeStatus(status: "published" | "archived") {
    setChangingStatus(true);
    const response = await fetch(`/api/admin/pages/${encodeURIComponent(page.id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug: page.slug, title: page.title, excerpt: page.excerpt, status, isHomepage: false, blocks: page.blocks, seoTitle: page.seoTitle, seoDescription: page.seoDescription }) });
    if (!response.ok) { const data = await response.json() as { error?: string }; setChangingStatus(false); window.alert(data.error ?? (status === "published" ? "The page could not be unarchived." : "The page could not be archived.")); return; }
    setChangingStatus(false);
    router.refresh();
  }

  async function changeHomepage(nextHomepage: boolean) {
    if (page.status !== "published") return;
    setHomepageOverride(nextHomepage);
    setChangingHomepage(true);
    const response = await fetch(`/api/admin/pages/${encodeURIComponent(page.id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(pagePayload(page, { isHomepage: nextHomepage, status: "published" })) });
    if (!response.ok) {
      const data = await response.json() as { error?: string };
      setHomepageOverride(null);
      setChangingHomepage(false);
      window.alert(data.error ?? "The homepage setting could not be updated.");
      return;
    }
    setHomepageOverride(null);
    setChangingHomepage(false);
    router.refresh();
  }

  async function saveQuickEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingQuickEdit(true);
    setQuickError("");
    const response = await fetch(`/api/admin/pages/${encodeURIComponent(page.id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(pagePayload(page, { title: quickTitle, slug: quickSlug, status: quickStatus, isHomepage: quickStatus === "published" && homepage })) });
    if (!response.ok) {
      const data = await response.json() as { error?: string };
      setSavingQuickEdit(false);
      setQuickError(data.error ?? "The page could not be updated.");
      return;
    }
    setSavingQuickEdit(false);
    setQuickEditOpen(false);
    router.refresh();
  }

  async function remove() {
    setDeleting(true);
    const response = await fetch(`/api/admin/pages/${encodeURIComponent(page.id)}`, { method: "DELETE" });
    if (!response.ok) {
      const data = await response.json() as { error?: string };
      setDeleting(false);
      setConfirmingDelete(false);
      window.alert(data.error ?? "The page could not be deleted.");
      return;
    }
    router.refresh();
  }

  return <>
    <div className="page-row-actions">
      <Link className="button button-secondary button-small" href={`/admin/pages/${page.id}/edit`}><Pencil size={13} /> Edit</Link>
      <button type="button" className="button button-secondary button-small" onClick={() => quickEditOpen ? setQuickEditOpen(false) : openQuickEdit()} aria-expanded={quickEditOpen} aria-controls={`quick-edit-${page.id}`} disabled={savingQuickEdit}>{quickEditOpen ? "Close quick edit" : "Quick edit"}</button>
      {page.status === "published" ? <Link className="button button-secondary button-small" href={publicPath(page)} target="_blank" rel="noreferrer"><ExternalLink size={13} /> View</Link> : null}
      <label className={`page-homepage-toggle${homepage ? " is-checked" : ""}`} title={page.status === "published" ? (homepage ? "This page is the homepage" : "Use this page as the homepage") : "Publish this page before setting it as the homepage"}>
        <input type="checkbox" checked={homepage} onChange={(event) => void changeHomepage(event.target.checked)} disabled={page.status !== "published" || changingHomepage || changingStatus} aria-label={`Use ${page.title} as homepage`} />
        <span>{changingHomepage ? "Updating…" : "Homepage"}</span>
      </label>
      {page.status !== "archived" ? <button type="button" className="button button-secondary button-small" onClick={() => void changeStatus("archived")} disabled={changingStatus}><Archive size={13} /> Archive</button> : <><button type="button" className="button button-secondary button-small" onClick={() => void changeStatus("published")} disabled={changingStatus}><ArchiveRestore size={13} /> {changingStatus ? "Unarchiving…" : "Unarchive"}</button><button type="button" className="button button-secondary button-small button-danger" onClick={() => setConfirmingDelete(true)} disabled={deleting || changingStatus}><Trash2 size={13} /> Delete</button></>}
    </div>
    {quickEditOpen ? <form id={`quick-edit-${page.id}`} className="page-quick-edit" onSubmit={(event) => void saveQuickEdit(event)}>
      <div className="page-quick-edit-header">
        <div><span className="eyebrow">Quick edit</span><strong>Update page details</strong></div>
        <span className={`status-badge status-${quickStatus === "published" ? "active" : quickStatus === "archived" ? "queued" : "draft"}`}><span className="status-dot" />{quickStatus}</span>
      </div>
      <div className="page-quick-edit-fields">
        <div className="field"><label htmlFor={`quick-title-${page.id}`}>Page title</label><input id={`quick-title-${page.id}`} value={quickTitle} onChange={(event) => setQuickTitle(event.target.value)} required maxLength={140} /></div>
        <div className="field"><label htmlFor={`quick-slug-${page.id}`}>Slug</label><input id={`quick-slug-${page.id}`} value={quickSlug} onChange={(event) => setQuickSlug(normalizeSlug(event.target.value))} required maxLength={120} /></div>
        <div className="field"><label htmlFor={`quick-status-${page.id}`}>Publishing state</label><select id={`quick-status-${page.id}`} value={quickStatus} onChange={(event) => setQuickStatus(event.target.value as PageStatus)}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></div>
      </div>
      {quickError ? <p className="form-error" role="alert">{quickError}</p> : null}
      <div className="page-quick-edit-actions"><button type="button" className="button button-secondary button-small" onClick={() => setQuickEditOpen(false)} disabled={savingQuickEdit}>Cancel</button><button type="submit" className="button button-small" disabled={savingQuickEdit}>{savingQuickEdit ? "Saving…" : "Update"}</button></div>
    </form> : null}
    {confirmingDelete ? <div className="page-delete-modal-backdrop" role="presentation"><div className="page-delete-modal" role="dialog" aria-modal="true" aria-labelledby={`delete-page-title-${page.id}`} aria-describedby={`delete-page-description-${page.id}`}><div className="page-delete-modal-icon"><Trash2 size={18} /></div><h2 id={`delete-page-title-${page.id}`}>Are you sure you want to remove this permanently?</h2><p id={`delete-page-description-${page.id}`}><strong>{page.title}</strong> and its saved revisions will be permanently deleted. This action cannot be undone.</p><div className="page-delete-modal-actions"><button type="button" className="button button-secondary" onClick={() => setConfirmingDelete(false)} disabled={deleting}>Cancel</button><button type="button" className="button button-danger page-delete-confirm" onClick={() => void remove()} disabled={deleting}><Trash2 size={14} />{deleting ? "Deleting…" : "Delete permanently"}</button></div></div></div> : null}
  </>;
}
