"use client";

import { useState } from "react";
import { Check, Edit3, LayoutTemplate, Plus, Archive, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { SiteTemplate, SiteTemplateKind } from "@/lib/types";

function label(kind: SiteTemplateKind): string { return kind === "header" ? "Header" : "Footer"; }

export function TemplateManager({ initialTemplates }: { initialTemplates: SiteTemplate[] }) {
  const router = useRouter();
  const [templates, setTemplates] = useState(initialTemplates);
  const [kind, setKind] = useState<SiteTemplateKind>("header");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function createTemplate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/admin/templates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, name: name.trim() || `New ${label(kind)}`, status: "draft", isActive: false }) });
      const body = await response.json() as { template?: { id: string }; error?: string };
      if (!response.ok || !body.template) throw new Error(body.error || "The template could not be created.");
      router.push(`/admin/appearance/templates/${body.template.id}/edit`);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "The template could not be created."); setSaving(false); }
  }

  async function activate(template: SiteTemplate) {
    setSaving(true); setError(""); setMessage("");
    try {
      const response = await fetch(`/api/admin/templates/${encodeURIComponent(template.id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: template.kind, name: template.name, status: "published", isActive: true, blocks: template.blocks }) });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error || "The template could not be activated.");
      setTemplates((current) => current.map((candidate) => candidate.kind === template.kind ? { ...candidate, isActive: candidate.id === template.id, status: candidate.id === template.id ? "published" : candidate.status } : candidate));
      setMessage(`${label(template.kind)} template activated.`);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "The template could not be activated."); } finally { setSaving(false); }
  }

  async function archive(template: SiteTemplate) {
    if (template.isActive || !window.confirm(`Archive ${template.name}?`)) return;
    setSaving(true); setError(""); setMessage("");
    try {
      const response = await fetch(`/api/admin/templates/${encodeURIComponent(template.id)}`, { method: "DELETE" });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error || "The template could not be archived.");
      setTemplates((current) => current.map((candidate) => candidate.id === template.id ? { ...candidate, status: "archived" } : candidate));
      setMessage(`${label(template.kind)} template archived.`);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "The template could not be archived."); } finally { setSaving(false); }
  }

  async function restore(template: SiteTemplate) {
    setSaving(true); setError(""); setMessage("");
    try {
      const response = await fetch(`/api/admin/templates/${encodeURIComponent(template.id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: template.kind, name: template.name, status: "draft", isActive: false, blocks: template.blocks }) });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error || "The template could not be restored.");
      setTemplates((current) => current.map((candidate) => candidate.id === template.id ? { ...candidate, status: "draft", isActive: false } : candidate));
      setMessage(`${label(template.kind)} template restored as a draft.`);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "The template could not be restored."); } finally { setSaving(false); }
  }

  const visible = templates.filter((template) => template.kind === kind);
  return <section className="panel template-manager"><div className="panel-header"><div><span className="eyebrow">Global system</span><h2 className="panel-title">Header &amp; Footer templates</h2><p className="row-meta">Build reusable shells with the same live canvas used for pages. Only one published template of each type is active at a time.</p></div><LayoutTemplate size={18} color="#0f776e" /></div><div className="appearance-tabs" role="tablist" aria-label="Template type"><button type="button" role="tab" aria-selected={kind === "header"} className={kind === "header" ? "is-active" : ""} onClick={() => setKind("header")}>Headers <span>{templates.filter((template) => template.kind === "header").length}</span></button><button type="button" role="tab" aria-selected={kind === "footer"} className={kind === "footer" ? "is-active" : ""} onClick={() => setKind("footer")}>Footers <span>{templates.filter((template) => template.kind === "footer").length}</span></button></div><form className="template-create-form" onSubmit={createTemplate}><div className="field"><label htmlFor="template-name">New {label(kind).toLowerCase()} template name</label><input id="template-name" value={name} onChange={(event) => setName(event.target.value)} placeholder={`Marketing ${label(kind)}`} /></div><button className="button button-small" type="submit" disabled={saving}><Plus size={14} /> Create {label(kind).toLowerCase()}</button></form><div className="template-list">{visible.length > 0 ? visible.map((template) => <article className={`template-row ${template.isActive ? "is-active" : ""}`} key={template.id}><div className="template-row-icon"><LayoutTemplate size={17} /></div><div className="template-row-copy"><div className="template-row-title"><strong>{template.name}</strong>{template.isActive ? <span className="page-home-badge"><Check size={12} /> Active</span> : null}</div><small>{template.status} · {template.blocks.length} top-level block{template.blocks.length === 1 ? "" : "s"} · revision {template.revision}</small></div><span className={`status-badge status-${template.status === "published" ? "active" : template.status === "archived" ? "queued" : "draft"}`}><span className="status-dot" />{template.status}</span><div className="template-row-actions"><Link href={`/admin/appearance/templates/${template.id}/edit`} className="panel-link"><Edit3 size={14} /> Edit</Link>{template.isActive ? <span className="row-meta">Live on public site</span> : template.status === "archived" ? <button type="button" className="panel-link" onClick={() => void restore(template)} disabled={saving}><RotateCcw size={14} /> Restore</button> : <button type="button" className="panel-link" onClick={() => void activate(template)} disabled={saving}><Check size={14} /> Use this</button>}{!template.isActive && template.status !== "archived" ? <button type="button" className="panel-link panel-link-danger" onClick={() => void archive(template)} disabled={saving}><Archive size={14} /> Archive</button> : null}</div></article>) : <div className="empty-state"><LayoutTemplate size={20} /><h3>No {label(kind).toLowerCase()} templates yet</h3><p>Create one above to open the visual editor with a starter layout.</p></div>}</div>{error ? <p className="form-error" role="alert">{error}</p> : null}{message ? <p className="form-success" role="status">{message}</p> : null}</section>;
}
