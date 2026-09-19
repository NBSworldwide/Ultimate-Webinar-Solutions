"use client";

import { FilePlus2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

function slugify(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export function NewPageDialog() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function createPage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (trimmedTitle.length < 2) {
      setError("Enter a page title to continue.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/admin/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmedTitle, slug: slugify(trimmedTitle), excerpt: "", status: "draft", isHomepage: false, blocks: [], seoTitle: "", seoDescription: "" }),
      });
      const data = await response.json() as { page?: { id: string }; error?: string };
      if (!response.ok || !data.page) throw new Error(data.error ?? "The page could not be created.");
      router.push(`/admin/pages/${data.page.id}/edit`);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "The page could not be created.");
      setSaving(false);
    }
  }

  return <div className="new-page-dialog-backdrop"><section className="new-page-dialog" role="dialog" aria-modal="true" aria-labelledby="new-page-dialog-title">
    <div className="new-page-dialog-header"><div className="new-page-dialog-icon"><FilePlus2 size={18} /></div><div><span className="eyebrow">Content management</span><h1 id="new-page-dialog-title">Add page</h1></div><button type="button" className="icon-button" aria-label="Close add page dialog" onClick={() => router.push("/admin/pages")}><X size={16} /></button></div>
    <p className="new-page-dialog-copy">Start with a blank, full-screen HTML canvas. Add the title now, then build the page from the editor without any starter blocks or content padding.</p>
    <form onSubmit={createPage}><div className="field"><label htmlFor="new-page-title">Page title</label><input id="new-page-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="About our studio" autoFocus required /></div><div className="new-page-dialog-actions"><button type="button" className="button button-secondary" onClick={() => router.push("/admin/pages")}>Cancel</button><button type="submit" className="button" disabled={saving}>{saving ? "Creating…" : "Create blank page"}</button></div>{error ? <p className="form-error" role="alert">{error}</p> : null}</form>
  </section></div>;
}
