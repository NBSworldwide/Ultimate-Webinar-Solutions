"use client";

import { useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Copy, GripVertical, Image, LayoutTemplate, Megaphone, Minus, Package, Plus, Save, Trash2, Type } from "lucide-react";
import Link from "next/link";
import { PageRenderer } from "@/components/page-renderer";
import type { ContentPage, PageBlock, PageBlockType, PageStatus } from "@/lib/types";
import { useRouter } from "next/navigation";

const blockLibrary: Array<{ type: PageBlockType; label: string; description: string; icon: typeof LayoutTemplate }> = [
  { type: "hero", label: "Hero", description: "Lead with a headline and call to action.", icon: LayoutTemplate },
  { type: "rich_text", label: "Rich text", description: "Add a heading and readable body copy.", icon: Type },
  { type: "image", label: "Image", description: "Show a hosted image with alt text.", icon: Image },
  { type: "cta", label: "Call to action", description: "Close with a focused next step.", icon: Megaphone },
  { type: "product_grid", label: "Product grid", description: "Feature purchasable products on a page.", icon: Package },
  { type: "product_category", label: "Product category", description: "Show a filtered collection of products.", icon: Package },
  { type: "sale_grid", label: "Sale items", description: "Highlight products with active sale pricing.", icon: Package },
  { type: "gallery", label: "Photo gallery", description: "Show an ordered gallery with captions and alt text.", icon: Image },
  { type: "testimonial_grid", label: "Testimonials", description: "Display approved feedback from verified customers.", icon: Type },
  { type: "spacer", label: "Spacer", description: "Add intentional breathing room.", icon: Minus },
];

function slugify(value: string): string { return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120); }

function newBlock(type: PageBlockType): PageBlock {
  const data: Record<string, string | number> = type === "hero"
    ? { eyebrow: "Featured content", heading: "A page built for your audience.", body: "Introduce this page with clear, useful context.", ctaLabel: "Explore sessions", ctaHref: "/webinars" }
    : type === "rich_text" ? { heading: "A useful section", body: "Add the supporting content your visitors need here." }
      : type === "image" ? { src: "", alt: "", caption: "" }
        : type === "cta" ? { heading: "Ready for the next step?", body: "Give visitors one clear action to take next.", buttonLabel: "Contact us", buttonHref: "/login" }
          : type === "product_grid" ? { heading: "Featured products", maxItems: 6 }
            : type === "product_category" ? { heading: "Shop the collection", category: "Event kits", maxItems: 6 }
              : type === "sale_grid" ? { heading: "Limited-time offers", maxItems: 6 }
                : type === "gallery" ? { heading: "Photo gallery", images: "" }
                  : type === "testimonial_grid" ? { heading: "What customers are saying", maxItems: 6 }
          : { height: 48 };
  return { id: crypto.randomUUID(), type, data };
}

function updateBlockData(block: PageBlock, key: string, value: string | number): PageBlock { return { ...block, data: { ...block.data, [key]: value } }; }

function BlockFields({ block, onChange }: { block: PageBlock; onChange: (key: string, value: string | number) => void }) {
  const field = (key: string, label: string, multiline = false) => <div className="field" key={key}><label htmlFor={`page-${block.id}-${key}`}>{label}</label>{multiline ? <textarea id={`page-${block.id}-${key}`} value={String(block.data[key] ?? "")} onChange={(event) => onChange(key, event.target.value)} /> : <input id={`page-${block.id}-${key}`} value={String(block.data[key] ?? "")} onChange={(event) => onChange(key, event.target.value)} />}</div>;
  if (block.type === "hero") return <div className="page-builder-fields">{field("eyebrow", "Eyebrow")}{field("heading", "Heading")}{field("body", "Body copy", true)}<div className="form-row">{field("ctaLabel", "Button label")}{field("ctaHref", "Button link")}</div></div>;
  if (block.type === "rich_text") return <div className="page-builder-fields">{field("heading", "Heading")}{field("body", "Body copy", true)}</div>;
  if (block.type === "image") return <div className="page-builder-fields">{field("src", "Image URL")}{field("alt", "Alt text")}{field("caption", "Caption")}</div>;
  if (block.type === "cta") return <div className="page-builder-fields">{field("heading", "Heading")}{field("body", "Body copy", true)}<div className="form-row">{field("buttonLabel", "Button label")}{field("buttonHref", "Button link")}</div></div>;
  if (block.type === "product_grid") return <div className="page-builder-fields">{field("heading", "Heading")}{field("category", "Optional category filter")} {field("maxItems", "Maximum products")}</div>;
  if (block.type === "product_category") return <div className="page-builder-fields">{field("heading", "Heading")}{field("category", "Category name")}{field("maxItems", "Maximum products")}</div>;
  if (block.type === "sale_grid") return <div className="page-builder-fields">{field("heading", "Heading")}{field("maxItems", "Maximum products")}</div>;
  if (block.type === "gallery") return <div className="page-builder-fields">{field("heading", "Heading")}{field("images", "Images", true)}<small>One image per line. Use the format: image URL | alt text | caption</small></div>;
  if (block.type === "testimonial_grid") return <div className="page-builder-fields">{field("heading", "Heading")}{field("maxItems", "Maximum testimonials")}</div>;
  return <div className="page-builder-fields">{field("height", "Height (pixels)")}</div>;
}

function BlockEditor({ block, index, count, onChange, onMove, onDuplicate, onDelete, onDragStart, onDrop }: { block: PageBlock; index: number; count: number; onChange: (key: string, value: string | number) => void; onMove: (offset: number) => void; onDuplicate: () => void; onDelete: () => void; onDragStart: () => void; onDrop: () => void }) {
  const label = blockLibrary.find((item) => item.type === block.type)?.label ?? block.type;
  return <article className="page-builder-block" draggable onDragStart={onDragStart} onDragOver={(event) => event.preventDefault()} onDrop={onDrop}><header className="page-builder-block-header"><span className="page-builder-drag-handle" title="Drag to reorder" aria-label="Drag to reorder"><GripVertical size={16} /><strong>{index + 1}. {label}</strong></span><div className="page-builder-block-actions"><button type="button" className="icon-button" onClick={() => onMove(-1)} disabled={index === 0} aria-label="Move block up"><ArrowUp size={14} /></button><button type="button" className="icon-button" onClick={() => onMove(1)} disabled={index === count - 1} aria-label="Move block down"><ArrowDown size={14} /></button><button type="button" className="icon-button" onClick={onDuplicate} aria-label="Duplicate block"><Copy size={14} /></button><button type="button" className="icon-button icon-button-danger" onClick={onDelete} aria-label="Delete block"><Trash2 size={14} /></button></div></header><BlockFields block={block} onChange={onChange} /></article>;
}

export function PageBuilder({ page }: { page?: ContentPage }) {
  const router = useRouter();
  const [title, setTitle] = useState(() => page?.title ?? "");
  const [slug, setSlug] = useState(() => page?.slug ?? "");
  const [excerpt, setExcerpt] = useState(() => page?.excerpt ?? "");
  const [status, setStatus] = useState<PageStatus>(() => page?.status ?? "draft");
  const [seoTitle, setSeoTitle] = useState(() => page?.seoTitle ?? "");
  const [seoDescription, setSeoDescription] = useState(() => page?.seoDescription ?? "");
  const [blocks, setBlocks] = useState<PageBlock[]>(() => page?.blocks ?? [newBlock("hero"), newBlock("rich_text")]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  function addBlock(type: PageBlockType) { setBlocks((current) => [...current, newBlock(type)]); setMessage(""); }
  function updateBlock(index: number, key: string, value: string | number) { setBlocks((current) => current.map((block, itemIndex) => itemIndex === index ? updateBlockData(block, key, value) : block)); }
  function moveBlock(index: number, offset: number) { setBlocks((current) => { const target = index + offset; if (target < 0 || target >= current.length) return current; const next = [...current]; [next[index], next[target]] = [next[target], next[index]]; return next; }); }
  function duplicateBlock(index: number) { setBlocks((current) => { const copy = { ...current[index], id: crypto.randomUUID(), data: { ...current[index].data } }; return [...current.slice(0, index + 1), copy, ...current.slice(index + 1)]; }); }
  function deleteBlock(index: number) { setBlocks((current) => current.filter((_, itemIndex) => itemIndex !== index)); }
  function dropBlock(targetIndex: number) { if (dragIndex === null || dragIndex === targetIndex) return; setBlocks((current) => { const next = [...current]; const [moved] = next.splice(dragIndex, 1); next.splice(targetIndex, 0, moved); return next; }); setDragIndex(null); }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(""); setMessage("");
    try {
      const response = await fetch(page ? `/api/admin/pages/${encodeURIComponent(page.id)}` : "/api/admin/pages", { method: page ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, slug: slug || slugify(title), excerpt, status, blocks, seoTitle, seoDescription }) });
      const data = await response.json() as { page?: { id: string; slug: string }; error?: string };
      if (!response.ok || !data.page) throw new Error(data.error ?? "The page could not be saved.");
      if (!page) router.push(`/admin/pages/${data.page.id}/edit`);
      else setMessage("Page saved.");
    } catch (failure) { setError(failure instanceof Error ? failure.message : "The page could not be saved."); } finally { setSaving(false); }
  }

  return <form className="page-builder" onSubmit={save}><div className="page-builder-toolbar"><div><span className="eyebrow">Visual page editor</span><h1 className="page-title">{page ? "Edit page" : "Create a page"}</h1><p className="page-subtitle">Compose reusable blocks, drag them into order, then publish when the page is ready.</p></div><div className="detail-actions"><Link href="/admin/pages" className="button button-secondary"><ArrowLeft size={14} /> Pages</Link><button type="button" className={`button button-secondary ${preview ? "button-active" : ""}`} onClick={() => setPreview((current) => !current)}>{preview ? "Edit blocks" : "Preview page"}</button><button className="button" type="submit" disabled={saving}><Save size={14} />{saving ? "Saving…" : "Save page"}</button></div></div><div className="page-builder-layout"><section className="page-builder-main"><div className="admin-form-card page-builder-settings"><div className="form-row"><div className="field"><label htmlFor="page-title">Page title</label><input id="page-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="About our studio" required /></div><div className="field"><label htmlFor="page-slug">URL slug</label><input id="page-slug" value={slug} onChange={(event) => setSlug(slugify(event.target.value))} placeholder="about-our-studio" required={Boolean(page)} /><small>Public URL: /pages/{slug || slugify(title) || "your-page"}</small></div></div><div className="form-row"><div className="field"><label htmlFor="page-status">Publishing state</label><select id="page-status" value={status} onChange={(event) => setStatus(event.target.value as PageStatus)}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></div><div className="field"><label htmlFor="page-excerpt">Excerpt</label><input id="page-excerpt" value={excerpt} onChange={(event) => setExcerpt(event.target.value)} placeholder="A short summary for listings and previews." /></div></div></div>{preview ? <div className="page-preview-panel"><div className="page-preview-label"><span className="eyebrow">Live preview</span><span>{blocks.length} blocks</span></div><PageRenderer blocks={blocks} /></div> : <div className="page-builder-canvas">{blocks.length === 0 ? <div className="page-builder-empty"><Plus size={20} /><h2>Start building your page</h2><p>Choose a block from the library to add your first section.</p></div> : blocks.map((block, index) => <BlockEditor key={block.id} block={block} index={index} count={blocks.length} onChange={(key, value) => updateBlock(index, key, value)} onMove={(offset) => moveBlock(index, offset)} onDuplicate={() => duplicateBlock(index)} onDelete={() => deleteBlock(index)} onDragStart={() => setDragIndex(index)} onDrop={() => dropBlock(index)} />)}</div>}{error ? <p className="form-error" role="alert">{error}</p> : null}{message ? <p className="form-success" role="status">{message}</p> : null}</section><aside className="page-builder-sidebar"><section className="panel page-block-library"><div className="panel-header"><div><span className="eyebrow">Blocks</span><h2 className="panel-title">Add content</h2></div><Plus size={16} color="#8b9995" /></div>{blockLibrary.map(({ type, label, description, icon: Icon }) => <button type="button" className="page-block-library-item" key={type} onClick={() => addBlock(type)}><span className="page-block-icon"><Icon size={15} /></span><span><strong>{label}</strong><small>{description}</small></span><ArrowRight size={14} /></button>)}</section><section className="panel page-seo-panel"><div className="panel-header"><div><span className="eyebrow">Search appearance</span><h2 className="panel-title">SEO fields</h2></div></div><div className="form-grid"><div className="field"><label htmlFor="page-seo-title">SEO title</label><input id="page-seo-title" value={seoTitle} onChange={(event) => setSeoTitle(event.target.value)} placeholder={title || "Page title"} /></div><div className="field"><label htmlFor="page-seo-description">SEO description</label><textarea id="page-seo-description" value={seoDescription} onChange={(event) => setSeoDescription(event.target.value)} placeholder={excerpt || "Search description"} /></div></div></section></aside></div></form>;
}
