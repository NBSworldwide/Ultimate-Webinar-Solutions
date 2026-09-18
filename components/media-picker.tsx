"use client";

import { useEffect, useState } from "react";
import { Image, Search, X } from "lucide-react";
import type { MediaAsset } from "@/lib/types";

export function MediaPicker({ value, onChange, label = "Choose from Media Library" }: { value: string; onChange: (value: string) => void; label?: string }) {
  const [open, setOpen] = useState(false);
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let active = true;
    void Promise.resolve().then(() => { if (active) setLoading(true); }).then(() => fetch("/api/admin/media")).then((response) => response.json()).then((body: { assets?: MediaAsset[] }) => { if (active) setAssets(body.assets ?? []); }).catch(() => undefined).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [open]);

  const visible = assets.filter((asset) => `${asset.fileName} ${asset.altText} ${asset.caption}`.toLowerCase().includes(query.trim().toLowerCase()));
  return <><button type="button" className="button button-secondary button-small" onClick={() => setOpen(true)}><Image size={13} /> {label}</button>{open ? <div className="media-picker-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}><section className="panel media-picker" role="dialog" aria-modal="true" aria-labelledby="media-picker-title"><div className="panel-header"><div><span className="eyebrow">Reusable assets</span><h2 className="panel-title" id="media-picker-title">Media Library</h2></div><button type="button" className="icon-button" onClick={() => setOpen(false)} aria-label="Close media picker"><X size={16} /></button></div><div className="admin-search-field media-picker-search"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search assets" aria-label="Search media assets" autoFocus /></div>{loading ? <div className="empty-state"><p>Loading assets…</p></div> : visible.length > 0 ? <div className="media-picker-grid">{visible.map((asset) => <button type="button" className="media-picker-item" key={asset.id} onClick={() => { onChange(asset.url); setOpen(false); }}><img src={asset.url} alt={asset.altText} /><span>{asset.fileName}</span></button>)}</div> : <div className="empty-state"><Image size={20} /><h3>No matching assets</h3><p>Upload an image from the Media Library first.</p></div>}</section></div> : null}</>;
}
