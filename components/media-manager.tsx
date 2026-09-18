"use client";

import { useMemo, useRef, useState } from "react";
import { ImagePlus, Search, Trash2, Upload } from "lucide-react";
import type { MediaAsset } from "@/lib/types";

function readableSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MediaManager({ initialAssets }: { initialAssets: MediaAsset[] }) {
  const [assets, setAssets] = useState(initialAssets);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(initialAssets[0]?.id ?? null);
  const [altText, setAltText] = useState(initialAssets[0]?.altText ?? "");
  const [caption, setCaption] = useState(initialAssets[0]?.caption ?? "");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const visibleAssets = useMemo(() => assets.filter((asset) => `${asset.fileName} ${asset.altText} ${asset.caption}`.toLowerCase().includes(query.trim().toLowerCase())), [assets, query]);
  const selected = assets.find((asset) => asset.id === selectedId) ?? null;

  function selectAsset(asset: MediaAsset) {
    setSelectedId(asset.id);
    setAltText(asset.altText);
    setCaption(asset.caption);
    setMessage("");
    setError("");
  }

  async function upload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) { setError("Choose an image first."); return; }
    setUploading(true); setError(""); setMessage("");
    const body = new FormData(); body.set("file", file);
    try {
      const response = await fetch("/api/admin/media", { method: "POST", body });
      const result = await response.json() as { error?: string; asset?: MediaAsset };
      if (!response.ok || !result.asset) throw new Error(result.error || "The image could not be uploaded.");
      setAssets((current) => [result.asset!, ...current]);
      selectAsset(result.asset);
      if (fileRef.current) fileRef.current.value = "";
      setMessage("Image uploaded to the local Media Library.");
    } catch (uploadError) { setError(uploadError instanceof Error ? uploadError.message : "The image could not be uploaded."); } finally { setUploading(false); }
  }

  async function saveMetadata() {
    if (!selected) return;
    setError(""); setMessage("");
    try {
      const response = await fetch(`/api/admin/media/${encodeURIComponent(selected.id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ altText, caption }) });
      const result = await response.json() as { error?: string; asset?: MediaAsset };
      if (!response.ok || !result.asset) throw new Error(result.error || "The media description could not be saved.");
      setAssets((current) => current.map((asset) => asset.id === result.asset!.id ? result.asset! : asset));
      setMessage("Media details saved.");
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "The media description could not be saved."); }
  }

  async function trash() {
    if (!selected || !window.confirm(`Move ${selected.fileName} to the trash?`)) return;
    setError(""); setMessage("");
    try {
      const response = await fetch(`/api/admin/media/${encodeURIComponent(selected.id)}`, { method: "DELETE" });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "The media asset could not be trashed.");
      const next = assets.filter((asset) => asset.id !== selected.id); setAssets(next); selectAsset(next[0] ?? ({ id: "", altText: "", caption: "" } as MediaAsset)); setSelectedId(next[0]?.id ?? null); setMessage("Media asset moved to the trash.");
    } catch (trashError) { setError(trashError instanceof Error ? trashError.message : "The media asset could not be trashed."); }
  }

  return <div className="media-manager"><div className="media-manager-toolbar"><div className="admin-search-field"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search filename or description" aria-label="Search media" /></div><form className="media-upload-form" onSubmit={upload}><input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" /><button className="button" type="submit" disabled={uploading}><Upload size={14} />{uploading ? "Uploading…" : "Upload image"}</button></form></div>{error ? <p className="form-error" role="alert">{error}</p> : null}{message ? <p className="form-success" role="status">{message}</p> : null}<div className="media-manager-layout"><section className="media-grid" aria-label="Media assets">{visibleAssets.length > 0 ? visibleAssets.map((asset) => <button type="button" className={`media-card ${asset.id === selectedId ? "is-selected" : ""}`} key={asset.id} onClick={() => selectAsset(asset)}><span className="media-card-image"><img src={asset.url} alt="" loading="lazy" /></span><span className="media-card-name">{asset.fileName}</span><small>{readableSize(asset.fileSize)}</small></button>) : <div className="empty-state"><ImagePlus size={20} /><h3>No media assets yet</h3><p>Upload a local image to reuse it in pages, forms, and site identity.</p></div>}</section><aside className="panel media-details-panel">{selected ? <><div className="panel-header"><div><span className="eyebrow">Asset details</span><h2 className="panel-title">{selected.fileName}</h2></div><button type="button" className="icon-button icon-button-danger" onClick={trash} aria-label="Move media to trash"><Trash2 size={15} /></button></div><img className="media-detail-preview" src={selected.url} alt={altText} /><dl className="media-meta"><div><dt>URL</dt><dd>{selected.url}</dd></div><div><dt>Type</dt><dd>{selected.mimeType}</dd></div><div><dt>Size</dt><dd>{readableSize(selected.fileSize)}</dd></div></dl><div className="form-grid"><div className="field"><label htmlFor="media-alt">Alt text</label><input id="media-alt" value={altText} onChange={(event) => setAltText(event.target.value)} placeholder="Describe the image" /></div><div className="field"><label htmlFor="media-caption">Caption</label><textarea id="media-caption" value={caption} onChange={(event) => setCaption(event.target.value)} rows={3} /></div><button type="button" className="button button-small" onClick={saveMetadata}>Save details</button></div></> : <div className="empty-state"><ImagePlus size={20} /><h3>Select an asset</h3><p>Choose an image to edit its accessibility text and caption.</p></div>}</aside></div></div>;
}
