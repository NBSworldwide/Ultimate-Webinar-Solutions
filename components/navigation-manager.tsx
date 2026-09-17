"use client";

import { ArrowDown, ArrowUp, ExternalLink, GripVertical, Plus, Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { NavigationCandidate, NavigationLocation, NavigationMenuItemView, NavigationMenuView } from "@/lib/navigation";

const locationOptions: Array<{ value: NavigationLocation; label: string; description: string }> = [
  { value: "header", label: "Header", description: "Main public navigation" },
  { value: "footer", label: "Footer", description: "Footer link group" },
  { value: "mobile", label: "Mobile", description: "Responsive navigation assignment" },
];

const defaultMenuSlugs = new Set(["primary-navigation", "footer-navigation"]);

function cloneMenu(menu: NavigationMenuView): NavigationMenuView {
  return { ...menu, locations: [...menu.locations], items: menu.items.map((item) => ({ ...item })) };
}

function itemIdentity(item: Pick<NavigationMenuItemView, "itemType" | "entityId">): string {
  return `${item.itemType}:${item.entityId ?? ""}`;
}

function candidateIdentity(candidate: NavigationCandidate): string {
  return `${candidate.itemType}:${candidate.entityId ?? ""}`;
}

function itemDepth(itemId: string, items: NavigationMenuItemView[]): number {
  const byId = new Map(items.map((item) => [item.id, item]));
  const visited = new Set<string>();
  let depth = 0;
  let parentId = byId.get(itemId)?.parentId ?? null;
  while (parentId && !visited.has(parentId) && depth < 100) {
    visited.add(parentId);
    depth += 1;
    parentId = byId.get(parentId)?.parentId ?? null;
  }
  return depth;
}

function descendantIds(itemId: string, items: NavigationMenuItemView[]): Set<string> {
  const descendants = new Set<string>();
  let changed = true;
  while (changed) {
    changed = false;
    for (const item of items) {
      if (item.parentId === itemId || (item.parentId && descendants.has(item.parentId))) {
        if (!descendants.has(item.id)) {
          descendants.add(item.id);
          changed = true;
        }
      }
    }
  }
  return descendants;
}

function itemTypeLabel(itemType: NavigationMenuItemView["itemType"]): string {
  return itemType === "product_category" ? "Product category" : itemType === "session_category" ? "Session category" : itemType === "custom" ? "Custom link" : itemType === "system" ? "System link" : itemType.charAt(0).toUpperCase() + itemType.slice(1);
}

function responseError(data: unknown, fallback: string): string {
  return typeof data === "object" && data !== null && "error" in data && typeof data.error === "string" ? data.error : fallback;
}

export function NavigationManager({ menus, candidates }: { menus: NavigationMenuView[]; candidates: NavigationCandidate[] }) {
  const router = useRouter();
  const [menuList, setMenuList] = useState(menus);
  const [draft, setDraft] = useState<NavigationMenuView | null>(() => menus[0] ? cloneMenu(menus[0]) : null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [menuName, setMenuName] = useState("");
  const [menuLocations, setMenuLocations] = useState<NavigationLocation[]>(["header"]);
  const [menuAutoAdd, setMenuAutoAdd] = useState(true);
  const [candidateKey, setCandidateKey] = useState("");
  const [customLabel, setCustomLabel] = useState("");
  const [customHref, setCustomHref] = useState("");
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [status, setStatus] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  function selectMenu(menu: NavigationMenuView) {
    if (dirty && !window.confirm("You have unsaved menu changes. Switch menus and discard them?")) return;
    setDraft(cloneMenu(menu));
    setDirty(false);
    setStatus(null);
  }

  function updateDraft(changes: Partial<NavigationMenuView>) {
    setDraft((current) => current ? { ...current, ...changes } : current);
    setDirty(true);
    setStatus(null);
  }

  function updateItem(id: string, changes: Partial<NavigationMenuItemView>) {
    setDraft((current) => current ? { ...current, items: current.items.map((item) => item.id === id ? { ...item, ...changes } : item) } : current);
    setDirty(true);
    setStatus(null);
  }

  function normalizeOrder(items: NavigationMenuItemView[]): NavigationMenuItemView[] {
    return items.map((item, index) => ({ ...item, sortOrder: index }));
  }

  function moveItem(id: string, offset: number) {
    setDraft((current) => {
      if (!current) return current;
      const index = current.items.findIndex((item) => item.id === id);
      const target = index + offset;
      if (index < 0 || target < 0 || target >= current.items.length) return current;
      const items = [...current.items];
      [items[index], items[target]] = [items[target], items[index]];
      return { ...current, items: normalizeOrder(items) };
    });
    setDirty(true);
    setStatus(null);
  }

  function dropItem(targetId: string) {
    if (!draggedItemId || draggedItemId === targetId) return;
    setDraft((current) => {
      if (!current) return current;
      const from = current.items.findIndex((item) => item.id === draggedItemId);
      const to = current.items.findIndex((item) => item.id === targetId);
      if (from < 0 || to < 0) return current;
      const items = [...current.items];
      const [moved] = items.splice(from, 1);
      items.splice(to, 0, moved);
      return { ...current, items: normalizeOrder(items) };
    });
    setDraggedItemId(null);
    setDirty(true);
    setStatus(null);
  }

  function removeItem(id: string) {
    setDraft((current) => {
      if (!current) return current;
      const removed = current.items.find((item) => item.id === id);
      if (!removed) return current;
      return { ...current, items: normalizeOrder(current.items.filter((item) => item.id !== id).map((item) => item.parentId === id ? { ...item, parentId: removed.parentId } : item)) };
    });
    setDirty(true);
    setStatus(null);
  }

  function addCandidate(candidate: NavigationCandidate) {
    setDraft((current) => {
      if (!current || current.items.some((item) => itemIdentity(item) === candidateIdentity(candidate))) return current;
      return { ...current, items: normalizeOrder([...current.items, { id: crypto.randomUUID(), parentId: null, label: candidate.label, href: candidate.href, itemType: candidate.itemType, entityId: candidate.entityId, openInNewTab: false, isVisible: true, sortOrder: current.items.length, autoAdded: false }]) };
    });
    setCandidateKey("");
    setDirty(true);
    setStatus(null);
  }

  function addCustomItem() {
    const label = customLabel.trim();
    const href = customHref.trim();
    if (!label || !href) return;
    setDraft((current) => current ? { ...current, items: normalizeOrder([...current.items, { id: crypto.randomUUID(), parentId: null, label, href, itemType: "custom", entityId: null, openInNewTab: false, isVisible: true, sortOrder: current.items.length, autoAdded: false }]) } : current);
    setCustomLabel("");
    setCustomHref("");
    setDirty(true);
    setStatus(null);
  }

  async function createMenu(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    setStatus(null);
    try {
      const response = await fetch("/api/admin/navigation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: menuName, locations: menuLocations, autoAddPublishedPages: menuAutoAdd }) });
      const data = await response.json() as { menu?: NavigationMenuView; error?: string };
      if (!response.ok || !data.menu) throw new Error(responseError(data, "The menu could not be created."));
      setMenuList((current) => [...current, data.menu!]);
      setDraft(cloneMenu(data.menu));
      setMenuName("");
      setDirty(false);
      setStatus({ kind: "success", text: "Menu created. Add links, then save the menu." });
      router.refresh();
    } catch (error) {
      setStatus({ kind: "error", text: error instanceof Error ? error.message : "The menu could not be created." });
    } finally {
      setCreating(false);
    }
  }

  async function saveMenu(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft) return;
    setSaving(true);
    setStatus(null);
    try {
      const response = await fetch(`/api/admin/navigation/${encodeURIComponent(draft.id)}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: draft.name, locations: draft.locations, autoAddPublishedPages: draft.autoAddPublishedPages, items: draft.items.map(({ id, parentId, label, href, itemType, entityId, openInNewTab, isVisible }) => ({ id, parentId, label, href, itemType, entityId, openInNewTab, isVisible })) }) });
      const data = await response.json() as { menu?: NavigationMenuView; error?: string };
      if (!response.ok || !data.menu) throw new Error(responseError(data, "The menu could not be saved."));
      setMenuList((current) => current.map((menu) => menu.id === data.menu!.id ? data.menu! : menu));
      setDraft(cloneMenu(data.menu));
      setDirty(false);
      setStatus({ kind: "success", text: "Menu saved and live placements refreshed." });
      router.refresh();
    } catch (error) {
      setStatus({ kind: "error", text: error instanceof Error ? error.message : "The menu could not be saved." });
    } finally {
      setSaving(false);
    }
  }

  async function deleteMenu() {
    if (!draft || defaultMenuSlugs.has(draft.slug) || !window.confirm(`Delete the ${draft.name} menu? This cannot be undone.`)) return;
    setDeleting(true);
    setStatus(null);
    try {
      const response = await fetch(`/api/admin/navigation/${encodeURIComponent(draft.id)}`, { method: "DELETE" });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(responseError(data, "The menu could not be deleted."));
      const remaining = menuList.filter((menu) => menu.id !== draft.id);
      setMenuList(remaining);
      setDraft(remaining[0] ? cloneMenu(remaining[0]) : null);
      setDirty(false);
      setStatus({ kind: "success", text: "Menu deleted." });
      router.refresh();
    } catch (error) {
      setStatus({ kind: "error", text: error instanceof Error ? error.message : "The menu could not be deleted." });
    } finally {
      setDeleting(false);
    }
  }

  const selectedIdentities = new Set(draft?.items.map(itemIdentity) ?? []);
  const candidateGroups = candidates.reduce<Map<string, NavigationCandidate[]>>((groups, candidate) => {
    const group = groups.get(candidate.group) ?? [];
    group.push(candidate);
    groups.set(candidate.group, group);
    return groups;
  }, new Map());
  const sortedItems = [...(draft?.items ?? [])].sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));

  return <div className="navigation-manager">
    <section className="navigation-manager-layout">
      <aside className="panel navigation-menu-list"><div className="panel-header"><div><span className="eyebrow">Saved menus</span><h2 className="panel-title">Menus</h2></div><span className="row-meta">{menuList.length}</span></div>{menuList.map((menu) => <button type="button" key={menu.id} className={`navigation-menu-list-item ${draft?.id === menu.id ? "active" : ""}`} onClick={() => selectMenu(menu)}><span><strong>{menu.name}</strong><small>{menu.locations.join(" · ")} · {menu.items.length} item{menu.items.length === 1 ? "" : "s"}</small></span><span className="status-dot" /></button>)}<form className="navigation-create-form" onSubmit={createMenu}><h3>Create a menu</h3><div className="field"><label htmlFor="navigation-new-name">Menu name</label><input id="navigation-new-name" value={menuName} onChange={(event) => setMenuName(event.target.value)} placeholder="Campaign menu" required /></div><fieldset className="navigation-location-grid"><legend>Theme locations</legend>{locationOptions.map((option) => <label className="check-field" key={option.value}><input type="checkbox" checked={menuLocations.includes(option.value)} onChange={(event) => setMenuLocations((current) => event.target.checked ? [...new Set([...current, option.value])] : current.filter((value) => value !== option.value))} /><span><strong>{option.label}</strong><small>{option.description}</small></span></label>)}</fieldset><label className="check-field"><input type="checkbox" checked={menuAutoAdd} onChange={(event) => setMenuAutoAdd(event.target.checked)} /><span>Automatically add published pages</span></label><button className="button button-small" type="submit" disabled={creating}><Plus size={14} />{creating ? "Creating…" : "Create menu"}</button></form></aside>
      {draft ? <form className="panel navigation-menu-editor" onSubmit={saveMenu}><div className="panel-header navigation-editor-header"><div><span className="eyebrow">Menu editor</span><h2 className="panel-title">{draft.name}</h2><span className="row-meta">Drag links to reorder · use the parent selector to nest items</span></div><div className="detail-actions"><button type="button" className="button button-secondary button-small" onClick={() => void deleteMenu()} disabled={deleting || defaultMenuSlugs.has(draft.slug)}><Trash2 size={14} />{deleting ? "Deleting…" : "Delete"}</button><button className="button button-small" type="submit" disabled={saving}><Save size={14} />{saving ? "Saving…" : "Save menu"}</button></div></div><div className="navigation-editor-settings"><div className="form-row"><div className="field"><label htmlFor="navigation-menu-name">Menu name</label><input id="navigation-menu-name" value={draft.name} onChange={(event) => updateDraft({ name: event.target.value })} required /></div><div className="field"><label>Theme locations</label><div className="navigation-location-chips">{locationOptions.map((option) => <label className="check-field" key={option.value}><input type="checkbox" checked={draft.locations.includes(option.value)} onChange={(event) => updateDraft({ locations: event.target.checked ? [...new Set([...draft.locations, option.value])] : draft.locations.filter((value) => value !== option.value) })} /><span>{option.label}</span></label>)}</div></div></div><label className="check-field"><input type="checkbox" checked={draft.autoAddPublishedPages} onChange={(event) => updateDraft({ autoAddPublishedPages: event.target.checked })} /><span><strong>Automatically add published pages to this menu</strong><small>New public pages appear at the end. You can relabel, hide, nest, or reorder them afterward.</small></span></label></div><div className="navigation-add-area"><div className="navigation-add-grid"><div className="field"><label htmlFor="navigation-candidate">Add a page, product, session, or system link</label><select id="navigation-candidate" value={candidateKey} onChange={(event) => { setCandidateKey(event.target.value); const candidate = candidates.find((item) => item.key === event.target.value); if (candidate) addCandidate(candidate); }}><option value="">Choose an item…</option>{[...candidateGroups.entries()].map(([group, groupCandidates]) => <optgroup key={group} label={group}>{groupCandidates.map((candidate) => <option key={candidate.key} value={candidate.key} disabled={selectedIdentities.has(candidateIdentity(candidate))}>{selectedIdentities.has(candidateIdentity(candidate)) ? `${candidate.label} (already added)` : candidate.label}</option>)}</optgroup>)}</select></div><div className="navigation-custom-form"><div className="field"><label htmlFor="navigation-custom-label">Custom link label</label><input id="navigation-custom-label" value={customLabel} onChange={(event) => setCustomLabel(event.target.value)} placeholder="Customer portal" /></div><div className="field"><label htmlFor="navigation-custom-href">Custom link URL</label><input id="navigation-custom-href" value={customHref} onChange={(event) => setCustomHref(event.target.value)} placeholder="/account or https://example.com" /></div><button className="button button-secondary button-small" type="button" onClick={addCustomItem}><Plus size={14} />Add custom link</button></div></div></div><div className="navigation-items-heading"><div><span className="eyebrow">Sortable structure</span><h3>Menu items <span className="muted">({sortedItems.length})</span></h3></div><span className="row-meta">Use the arrows for keyboard-friendly ordering</span></div>{sortedItems.length > 0 ? <div className="navigation-item-list">{sortedItems.map((item, index) => { const descendants = descendantIds(item.id, draft.items); return <article key={item.id} className={`navigation-item-row ${draggedItemId === item.id ? "dragging" : ""}`} draggable onDragStart={() => setDraggedItemId(item.id)} onDragOver={(event) => event.preventDefault()} onDrop={() => dropItem(item.id)} style={{ "--item-depth": itemDepth(item.id, draft.items) } as React.CSSProperties}><div className="navigation-item-indent"><GripVertical size={16} aria-hidden="true" /><span className="navigation-item-number">{index + 1}</span></div><div className="navigation-item-fields"><div className="form-row"><div className="field"><label htmlFor={`navigation-label-${item.id}`}>Label</label><input id={`navigation-label-${item.id}`} value={item.label} onChange={(event) => updateItem(item.id, { label: event.target.value })} /></div><div className="field"><label htmlFor={`navigation-href-${item.id}`}>Link URL</label><input id={`navigation-href-${item.id}`} value={item.href} onChange={(event) => updateItem(item.id, { href: event.target.value })} /></div></div><div className="form-row"><div className="field"><label htmlFor={`navigation-parent-${item.id}`}>Parent item</label><select id={`navigation-parent-${item.id}`} value={item.parentId ?? ""} onChange={(event) => updateItem(item.id, { parentId: event.target.value || null })}><option value="">Top level</option>{sortedItems.filter((candidate) => candidate.id !== item.id && !descendants.has(candidate.id)).map((candidate) => <option key={candidate.id} value={candidate.id}>{"— ".repeat(itemDepth(candidate.id, draft.items))}{candidate.label}</option>)}</select></div><div className="navigation-item-meta"><span className="status-badge status-draft"><span className="status-dot" />{itemTypeLabel(item.itemType)}</span>{item.autoAdded ? <span className="row-meta">Auto-added page</span> : null}</div></div><div className="navigation-item-toggles"><label className="check-field"><input type="checkbox" checked={item.isVisible} onChange={(event) => updateItem(item.id, { isVisible: event.target.checked })} /><span>Visible</span></label><label className="check-field"><input type="checkbox" checked={item.openInNewTab} onChange={(event) => updateItem(item.id, { openInNewTab: event.target.checked })} /><span>Open in new tab</span></label></div></div><div className="navigation-item-actions"><button type="button" className="icon-button" onClick={() => moveItem(item.id, -1)} disabled={index === 0} aria-label={`Move ${item.label} up`}><ArrowUp size={14} /></button><button type="button" className="icon-button" onClick={() => moveItem(item.id, 1)} disabled={index === sortedItems.length - 1} aria-label={`Move ${item.label} down`}><ArrowDown size={14} /></button><button type="button" className="icon-button icon-button-danger" onClick={() => removeItem(item.id)} aria-label={`Remove ${item.label}`}><Trash2 size={14} /></button></div></article>; })}</div> : <div className="empty-state navigation-empty"><Plus size={20} /><h3>This menu has no items yet</h3><p>Choose a saved page, product, session, or system link above, or add a custom URL.</p></div>}<div className="navigation-editor-footer"><span className="form-help">Private sessions and admin-only routes are never available in the public candidate list.</span><button className="button" type="submit" disabled={saving}><Save size={15} />{saving ? "Saving…" : "Save menu"}</button></div>{status ? <p className={status.kind === "success" ? "form-success" : "form-error"} role={status.kind === "success" ? "status" : "alert"}>{status.text}</p> : null}</form> : <section className="panel navigation-empty-editor"><ExternalLink size={22} /><h2>Create your first menu</h2><p>Use the form on the left to create a menu, then add saved pages, product collections, sessions, or custom links.</p></section>}
    </section>
  </div>;
}
