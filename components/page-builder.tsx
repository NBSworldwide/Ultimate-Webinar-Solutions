"use client";

import { useEffect, useLayoutEffect, useRef, useState, type DragEvent, type MouseEvent } from "react";
import { AlignLeft, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ClipboardPenLine, Code2, Copy, GripVertical, Heading1, Image, LayoutTemplate, MapPin, Menu, Megaphone, Minus, MousePointer, Package, Pencil, Plus, Save, Trash2, Type, Video, X } from "lucide-react";
import Link from "next/link";
import { PageRenderer } from "@/components/page-renderer";
import { PageBlockStyleFields } from "@/components/page-block-style-fields";
import type { NavigationMenuView } from "@/lib/navigation";
import type { ManagedServiceLocation } from "@/lib/service-locations";
import type {
  ContentPage,
  PageBlock,
  PageBlockLayout,
  PageBlockStyle,
  PageBlockType,
  PageContainerAlign,
  PageContainerContentWidth,
  PageContainerDirection,
  PageContainerJustify,
  PageContainerMeasureUnit,
  PageContainerMode,
  PageContainerSpacing,
  PageContainerWrap,
  PageStatus,
  FormDefinition,
} from "@/lib/types";
import { useRouter } from "next/navigation";

type BlockPath = number[];
type LibraryCategory = "layout" | "basic";
type BlockLibraryItem = { key: string; type: PageBlockType; label: string; shortLabel?: string; description: string; icon: typeof LayoutTemplate; category: LibraryCategory; layoutMode?: PageContainerMode };

const blockLibrary: BlockLibraryItem[] = [
  { key: "container", type: "container", label: "Container", description: "Build a nested Flexbox layout.", icon: LayoutTemplate, category: "layout", layoutMode: "flex" },
  { key: "grid", type: "container", label: "Grid", description: "Create responsive grid columns.", icon: LayoutTemplate, category: "layout", layoutMode: "grid" },
  { key: "hero", type: "hero", label: "Hero", description: "Lead with a headline and call to action.", icon: LayoutTemplate, category: "basic" },
  { key: "heading", type: "heading", label: "Heading", description: "Add a semantic heading with optional link.", icon: Heading1, category: "basic" },
  { key: "rich_text", type: "rich_text", label: "Text editor", shortLabel: "Text", description: "Add formatted copy with a visual editor.", icon: AlignLeft, category: "basic" },
  { key: "image", type: "image", label: "Image", description: "Show a hosted image with alt text.", icon: Image, category: "basic" },
  { key: "image_box", type: "image_box", label: "Image box", description: "Combine an image, title, description, and link.", icon: Image, category: "basic" },
  { key: "icon_box", type: "icon_box", label: "Icon box", description: "Use a library icon with supporting content.", icon: LayoutTemplate, category: "basic" },
  { key: "video", type: "video", label: "Video", description: "Embed a YouTube, Vimeo, or hosted video.", icon: Video, category: "basic" },
  { key: "map", type: "map", label: "Google Maps", description: "Show a location with a safe map embed.", icon: LayoutTemplate, category: "basic" },
  { key: "location_index", type: "location_index", label: "Service locations", shortLabel: "Locations", description: "Show the editable page's live service-area directory.", icon: MapPin, category: "basic" },
  { key: "location_detail", type: "location_detail", label: "Service location template", shortLabel: "Location", description: "Render a managed service-area detail page.", icon: MapPin, category: "basic" },
  { key: "button", type: "button", label: "Button", description: "Add a styled link or call to action.", icon: MousePointer, category: "basic" },
  { key: "cta", type: "cta", label: "Call to action", shortLabel: "CTA", description: "Close with a focused next step.", icon: Megaphone, category: "basic" },
  { key: "product_grid", type: "product_grid", label: "Product grid", shortLabel: "Products", description: "Feature purchasable products on a page.", icon: Package, category: "basic" },
  { key: "product_category", type: "product_category", label: "Product category", shortLabel: "Category", description: "Show a filtered collection of products.", icon: Package, category: "basic" },
  { key: "sale_grid", type: "sale_grid", label: "Sale items", shortLabel: "Sale", description: "Highlight products with active sale pricing.", icon: Package, category: "basic" },
  { key: "gallery", type: "gallery", label: "Photo gallery", shortLabel: "Gallery", description: "Show an ordered gallery with captions and alt text.", icon: Image, category: "basic" },
  { key: "testimonial_grid", type: "testimonial_grid", label: "Testimonials", shortLabel: "Reviews", description: "Display approved feedback from verified customers.", icon: Type, category: "basic" },
  { key: "navigation_menu", type: "navigation_menu", label: "Navigation menu", shortLabel: "Menu", description: "Place a saved menu into this page.", icon: Menu, category: "basic" },
  { key: "form", type: "form", label: "Form", description: "Render a published reusable form.", icon: ClipboardPenLine, category: "basic" },
  { key: "html", type: "html", label: "HTML / embed", shortLabel: "HTML", description: "Insert sanitized semantic HTML or an approved video embed.", icon: Code2, category: "basic" },
  { key: "spacer", type: "spacer", label: "Spacer", description: "Add intentional breathing room.", icon: Minus, category: "basic" },
];

const iconSources = [
  { value: "fontawesome-regular", label: "Font Awesome · Regular" },
  { value: "fontawesome-solid", label: "Font Awesome · Solid" },
  { value: "fontawesome-brands", label: "Font Awesome · Brands" },
] as const;

const iconNames = [
  { value: "star", label: "Star" },
  { value: "heart", label: "Heart" },
  { value: "shield", label: "Shield" },
  { value: "check", label: "Check circle" },
  { value: "sparkles", label: "Sparkles" },
  { value: "calendar", label: "Calendar" },
  { value: "video", label: "Video" },
  { value: "gift", label: "Gift" },
  { value: "users", label: "Users" },
  { value: "trophy", label: "Trophy" },
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "youtube", label: "YouTube" },
  { value: "linkedin", label: "LinkedIn" },
] as const;

const containerPresets = [
  { key: "single", label: "Single column", description: "One full-width content area", mode: "flex" as const, slots: 1, widths: undefined, layout: { mode: "flex", direction: "column" } as PageBlockLayout },
  { key: "half", label: "50 / 50", description: "Two equal columns", mode: "flex" as const, slots: 2, widths: [50, 50], layout: { mode: "flex", direction: "row" } as PageBlockLayout },
  { key: "thirty-seventy", label: "30 / 70", description: "Narrow left, wide right", mode: "flex" as const, slots: 2, widths: [30, 70], layout: { mode: "flex", direction: "row" } as PageBlockLayout },
  { key: "seventy-thirty", label: "70 / 30", description: "Wide left, narrow right", mode: "flex" as const, slots: 2, widths: [70, 30], layout: { mode: "flex", direction: "row" } as PageBlockLayout },
  { key: "three-up", label: "Three equal", description: "Three equal columns", mode: "flex" as const, slots: 3, widths: [33.333, 33.333, 33.333], layout: { mode: "flex", direction: "row" } as PageBlockLayout },
  { key: "four-up", label: "Four equal", description: "Four 25% columns", mode: "flex" as const, slots: 4, widths: [25, 25, 25, 25], layout: { mode: "flex", direction: "row" } as PageBlockLayout },
  { key: "grid-two", label: "Grid 2 columns", description: "Two responsive grid tracks", mode: "grid" as const, slots: 2, widths: undefined, layout: { mode: "grid", columns: 2, rows: 1 } as PageBlockLayout },
  { key: "grid-three", label: "Grid 3 columns", description: "Three responsive grid tracks", mode: "grid" as const, slots: 3, widths: undefined, layout: { mode: "grid", columns: 3, rows: 1 } as PageBlockLayout },
  { key: "grid-four", label: "Grid 4 columns", description: "Four responsive grid tracks", mode: "grid" as const, slots: 4, widths: undefined, layout: { mode: "grid", columns: 4, rows: 1 } as PageBlockLayout },
] as const;

function slugify(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120);
}

function publicPath(slug: string, isHomepage = false): string { return isHomepage ? "/" : slug === "service-locations" ? "/locations" : slug === "products" ? "/products" : slug.startsWith("location-") ? `/locations/${slug.slice("location-".length)}` : `/pages/${slug || "your-page"}`; }

function newBlock(type: PageBlockType): PageBlock {
  const data: Record<string, string | number> = type === "hero"
    ? { eyebrow: "Featured content", heading: "A page built for your audience.", body: "Introduce this page with clear, useful context.", ctaLabel: "Explore sessions", ctaHref: "/webinars" }
    : type === "heading" ? { text: "A clear section heading", tag: "h2", link: "", linkTarget: "same", linkNofollow: "no" }
      : type === "rich_text" ? { heading: "A useful section", body: "Add the supporting content your visitors need here.", textColor: "", fontSize: "medium", textAlign: "left" }
      : type === "image" ? { src: "", alt: "", caption: "", imageResolution: "full", imageLinkMode: "none", imageLink: "" }
        : type === "image_box" ? { src: "", imageResolution: "full", title: "Feature title", description: "Describe this feature for your visitors.", imageLink: "", titleTag: "h3" }
          : type === "icon_box" ? { iconSource: "fontawesome-solid", iconName: "shield", iconView: "framed", iconUrl: "", title: "Feature title", description: "Describe this feature for your visitors.", link: "", titleTag: "h3" }
          : type === "video" ? { source: "youtube", url: "", start: 0, end: 0, autoplay: "no", mute: "no", loop: "no", controls: "yes", captions: "no", privacy: "yes", lazy: "yes", overlay: "hide", overlayImage: "", overlayAlt: "Video preview" }
          : type === "map" ? { locationMode: "address", address: "", latitude: "", longitude: "", zoom: 10, height: 360 }
                              : type === "location_index" ? { heading: "Sample service locations" }
                                : type === "location_detail" ? { locationSlug: "" }
              : type === "button" ? { buttonLabel: "Explore sessions", buttonHref: "/webinars", buttonType: "default", buttonIcon: "", buttonIconPosition: "left", buttonId: "" }
              : type === "cta" ? { heading: "Ready for the next step?", body: "Give visitors one clear action to take next.", buttonLabel: "Contact us", buttonHref: "/login" }
                  : type === "product_grid" ? { heading: "Featured products", category: "", columns: 3, itemsPerPage: 6, pagination: "numbers", sort: "name-asc", showImage: "yes", showSku: "yes", showDescription: "yes", showPrice: "yes", showInventory: "yes", showButton: "yes", buttonLabel: "View product", cardStyle: "card" }
                  : type === "product_category" ? { heading: "Shop the collection", category: "Event kits", columns: 3, itemsPerPage: 6, pagination: "numbers", sort: "name-asc", showImage: "yes", showSku: "yes", showDescription: "yes", showPrice: "yes", showInventory: "yes", showButton: "yes", buttonLabel: "View product", cardStyle: "card" }
                    : type === "sale_grid" ? { heading: "Limited-time offers", category: "", columns: 3, itemsPerPage: 6, pagination: "numbers", sort: "price-asc", showImage: "yes", showSku: "yes", showDescription: "yes", showPrice: "yes", showInventory: "yes", showButton: "yes", buttonLabel: "View product", cardStyle: "card" }
                      : type === "gallery" ? { heading: "Photo gallery", images: "" }
                        : type === "testimonial_grid" ? { heading: "What customers are saying", maxItems: 6 }
                            : type === "navigation_menu" ? { heading: "Explore more", menuId: "", layout: "horizontal" }
                              : type === "form" ? { heading: "Tell us how we can help", formSlug: "" }
                            : type === "html" ? { html: "<section class=\"embed-card\"><h2>Custom HTML section</h2><p>Add a safe, reusable markup snippet here.</p></section>" }
                              : { height: 48 };
  if (type === "container") {
    return {
      id: crypto.randomUUID(),
      type,
      data: {},
      layout: { mode: "flex", contentWidth: "boxed", spacing: "global", direction: "column", justifyContent: "start", alignItems: "stretch", wrap: "nowrap", columns: 2, rows: 1, autoFlow: "row", justifyItems: "stretch", gridOutline: false },
      children: [],
    };
  }
  return { id: crypto.randomUUID(), type, data };
}

function newBlockFromLibrary(item: BlockLibraryItem): PageBlock {
  const block = newBlock(item.type);
  if (item.type === "container" && item.layoutMode === "grid") {
    block.layout = { ...block.layout, mode: "grid", columns: 2, rows: 1, autoFlow: "row", justifyItems: "stretch", spacing: "global" };
  }
  return block;
}

function blockLibraryItem(block: PageBlock): BlockLibraryItem | undefined {
  if (block.type === "container") return block.layout?.mode === "grid" ? blockLibrary.find((item) => item.key === "grid") : blockLibrary.find((item) => item.key === "container");
  return blockLibrary.find((item) => item.type === block.type && item.category === "basic");
}

function blockLabel(block: PageBlock): string {
  return blockLibraryItem(block)?.label ?? block.type;
}

function updateBlockData(block: PageBlock, key: string, value: string | number): PageBlock {
  return { ...block, data: { ...block.data, [key]: value } };
}

function cloneBlock(block: PageBlock): PageBlock {
  return {
    ...block,
    id: crypto.randomUUID(),
    data: { ...block.data },
    style: block.style ? JSON.parse(JSON.stringify(block.style)) as PageBlockStyle : undefined,
    layout: block.layout ? { ...block.layout } : undefined,
    children: block.children?.map(cloneBlock),
  };
}

function pathEquals(left: BlockPath, right: BlockPath): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function isPathPrefix(prefix: BlockPath, path: BlockPath): boolean {
  return prefix.length < path.length && prefix.every((value, index) => value === path[index]);
}

function getBlockAtPath(blocks: PageBlock[], path: BlockPath): PageBlock | undefined {
  if (path.length === 0) return undefined;
  const [index, ...rest] = path;
  const block = blocks[index];
  if (!block) return undefined;
  return rest.length > 0 ? getBlockAtPath(block.children ?? [], rest) : block;
}

function findBlockPath(blocks: PageBlock[], id: string, parentPath: BlockPath = []): BlockPath | null {
  for (const [index, block] of blocks.entries()) {
    const path = [...parentPath, index];
    if (block.id === id) return path;
    const childPath = findBlockPath(block.children ?? [], id, path);
    if (childPath) return childPath;
  }
  return null;
}

function updateBlockAtPath(blocks: PageBlock[], path: BlockPath, update: (block: PageBlock) => PageBlock): PageBlock[] {
  if (path.length === 0) return blocks;
  const [index, ...rest] = path;
  if (!blocks[index]) return blocks;
  return blocks.map((block, itemIndex) => {
    if (itemIndex !== index) return block;
    if (rest.length === 0) return update(block);
    return { ...block, children: updateBlockAtPath(block.children ?? [], rest, update) };
  });
}

function updateChildrenAtPath(blocks: PageBlock[], parentPath: BlockPath, update: (children: PageBlock[]) => PageBlock[]): PageBlock[] {
  if (parentPath.length === 0) return update(blocks);
  return updateBlockAtPath(blocks, parentPath, (block) => ({ ...block, children: update(block.children ?? []) }));
}

function removeBlockAtPath(blocks: PageBlock[], path: BlockPath): { blocks: PageBlock[]; removed?: PageBlock } {
  if (path.length === 0) return { blocks };
  const [index, ...rest] = path;
  if (!blocks[index]) return { blocks };
  if (rest.length === 0) {
    const next = [...blocks];
    const [removed] = next.splice(index, 1);
    return { blocks: next, removed };
  }
  let removed: PageBlock | undefined;
  const next = blocks.map((block, itemIndex) => {
    if (itemIndex !== index) return block;
    const result = removeBlockAtPath(block.children ?? [], rest);
    removed = result.removed;
    return { ...block, children: result.blocks };
  });
  return { blocks: next, removed };
}

function adjustPathAfterRemoval(path: BlockPath, removedPath: BlockPath): BlockPath {
  const adjusted = [...path];
  const shared = Math.min(path.length, removedPath.length);
  for (let index = 0; index < shared; index += 1) {
    if (path[index] !== removedPath[index]) {
      if (index === 0 || path.slice(0, index).every((value, itemIndex) => value === removedPath[itemIndex])) {
        if (path[index] > removedPath[index]) adjusted[index] -= 1;
      }
      break;
    }
  }
  return adjusted;
}

function insertBeforePath(blocks: PageBlock[], targetPath: BlockPath, block: PageBlock): PageBlock[] {
  if (targetPath.length === 0) return [...blocks, block];
  const parentPath = targetPath.slice(0, -1);
  const index = targetPath[targetPath.length - 1];
  return updateChildrenAtPath(blocks, parentPath, (children) => {
    const next = [...children];
    next.splice(Math.max(0, Math.min(index, next.length)), 0, block);
    return next;
  });
}

function insertAfterPath(blocks: PageBlock[], path: BlockPath, block: PageBlock): PageBlock[] {
  const parentPath = path.slice(0, -1);
  const index = path[path.length - 1] + 1;
  return updateChildrenAtPath(blocks, parentPath, (children) => {
    const next = [...children];
    next.splice(Math.max(0, Math.min(index, next.length)), 0, block);
    return next;
  });
}

function moveBlockBefore(blocks: PageBlock[], sourcePath: BlockPath, targetPath: BlockPath): PageBlock[] {
  if (pathEquals(sourcePath, targetPath) || isPathPrefix(sourcePath, targetPath)) return blocks;
  const result = removeBlockAtPath(blocks, sourcePath);
  if (!result.removed) return blocks;
  const adjustedTarget = adjustPathAfterRemoval(targetPath, sourcePath);
  if (!getBlockAtPath(result.blocks, adjustedTarget)) return blocks;
  return insertBeforePath(result.blocks, adjustedTarget, result.removed);
}

function moveBlockInto(blocks: PageBlock[], sourcePath: BlockPath, targetPath: BlockPath): PageBlock[] {
  if (pathEquals(sourcePath, targetPath) || isPathPrefix(sourcePath, targetPath)) return blocks;
  const result = removeBlockAtPath(blocks, sourcePath);
  if (!result.removed) return blocks;
  const adjustedTarget = adjustPathAfterRemoval(targetPath, sourcePath);
  const target = getBlockAtPath(result.blocks, adjustedTarget);
  if (!target || target.type !== "container") return blocks;
  return updateBlockAtPath(result.blocks, adjustedTarget, (block) => ({ ...block, children: [...(block.children ?? []), result.removed as PageBlock] }));
}

function moveWithinParent(blocks: PageBlock[], path: BlockPath, offset: number): PageBlock[] {
  if (path.length === 0) return blocks;
  const parentPath = path.slice(0, -1);
  const index = path[path.length - 1];
  return updateChildrenAtPath(blocks, parentPath, (children) => {
    const target = index + offset;
    if (target < 0 || target >= children.length) return children;
    const next = [...children];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    return next;
  });
}

function numberValue(raw: string): number | undefined {
  if (raw === "") return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

function makeColumnContainer(width?: number): PageBlock {
  const block = newBlock("container");
  block.layout = { mode: "flex", contentWidth: "full", spacing: "global", direction: "column", justifyContent: "start", alignItems: "stretch", wrap: "nowrap" };
  if (width !== undefined) block.style = { widthMode: "custom", width: { desktop: width }, maxWidth: { desktop: width } };
  return block;
}

function makeAutoContainer(child?: PageBlock): PageBlock {
  const block = newBlock("container");
  block.layout = { mode: "flex", contentWidth: "full", spacing: "global", direction: "column", justifyContent: "start", alignItems: "start", wrap: "nowrap", columns: 1, rows: 1, autoFlow: "row", justifyItems: "start" };
  if (child) block.children = [child];
  return block;
}

function ContainerFields({ block, onChange, onPreset }: { block: PageBlock; onChange: (layout: PageBlockLayout) => void; onPreset: (preset: typeof containerPresets[number]) => void }) {
  const layout = block.layout ?? {};
  const mode = layout.mode ?? "flex";
  const spacing = layout.spacing ?? (layout.columnGap === undefined && layout.rowGap === undefined ? "global" : "custom");

  return <div className="page-builder-fields page-container-fields">
    <div className="page-container-heading"><div><strong>Container layout</strong><small>Choose a structure, then add blocks inside each column.</small></div><span className="page-container-badge">{mode === "grid" ? "Grid" : "Flexbox"}</span></div>
    <div className="page-container-presets" aria-label="Container structure presets">
      {containerPresets.map((preset) => <button type="button" className="page-container-preset" key={preset.key} onClick={() => onPreset(preset)}><span className="page-container-preset-visual" data-slots={preset.slots} data-mode={preset.mode}>{Array.from({ length: preset.slots }).map((_, index) => <i key={index} />)}</span><strong>{preset.label}</strong><small>{preset.description}</small></button>)}
    </div>
    <div className="page-style-grid">
      <div className="field page-container-fixed-type"><span>Layout type</span><strong>{mode === "grid" ? "Grid" : "Flexbox"}</strong><small>This type is fixed by the Layout tile or preset used to create the container.</small></div>
      <label className="field"><span>Spacing preset</span><select value={spacing} onChange={(event) => { const next = event.target.value as PageContainerSpacing; onChange({ ...layout, spacing: next, columnGap: next === "global" ? undefined : layout.columnGap ?? 24, rowGap: next === "global" ? undefined : layout.rowGap ?? 24 }); }}><option value="global">Global site preset</option><option value="custom">Custom for this container</option></select><small>Global uses Site Settings padding and gap defaults.</small></label>
      <label className="field"><span>Content width</span><select value={layout.contentWidth ?? "boxed"} onChange={(event) => onChange({ ...layout, contentWidth: event.target.value as PageContainerContentWidth })}><option value="boxed">Boxed</option><option value="full">Full width</option></select></label>
      <label className="field"><span>Width</span><span className="page-container-measure"><input type="number" min="0" max="3000" value={layout.width ?? ""} onChange={(event) => onChange({ ...layout, width: numberValue(event.target.value) })} /><select aria-label="Width unit" value={layout.widthUnit ?? "px"} onChange={(event) => onChange({ ...layout, widthUnit: event.target.value as PageContainerMeasureUnit })}>{["px", "%", "em", "rem", "vw"].map((unit) => <option key={unit} value={unit}>{unit}</option>)}</select></span></label>
      <label className="field"><span>Minimum height</span><span className="page-container-measure"><input type="number" min="0" max="3000" value={layout.minHeight ?? ""} onChange={(event) => onChange({ ...layout, minHeight: numberValue(event.target.value) })} /><select aria-label="Minimum height unit" value={layout.minHeightUnit ?? "px"} onChange={(event) => onChange({ ...layout, minHeightUnit: event.target.value as PageContainerMeasureUnit })}>{["px", "em", "rem", "vh"].map((unit) => <option key={unit} value={unit}>{unit}</option>)}</select></span></label>
    </div>
    {mode === "flex" ? <div className="page-style-grid">
      <label className="field"><span>Direction</span><select value={layout.direction ?? "column"} onChange={(event) => onChange({ ...layout, direction: event.target.value as PageContainerDirection })}><option value="row">Row</option><option value="column">Column</option><option value="row-reverse">Row reversed</option><option value="column-reverse">Column reversed</option></select></label>
      <label className="field"><span>Justify content</span><select value={layout.justifyContent ?? "start"} onChange={(event) => onChange({ ...layout, justifyContent: event.target.value as PageContainerJustify })}><option value="start">Start</option><option value="center">Center</option><option value="end">End</option><option value="space-between">Space between</option><option value="space-around">Space around</option><option value="space-evenly">Space evenly</option></select></label>
      <label className="field"><span>Align items</span><select value={layout.alignItems ?? "stretch"} onChange={(event) => onChange({ ...layout, alignItems: event.target.value as PageContainerAlign })}><option value="start">Start</option><option value="center">Center</option><option value="end">End</option><option value="stretch">Stretch</option></select></label>
      <label className="field"><span>Wrap</span><select value={layout.wrap ?? "nowrap"} onChange={(event) => onChange({ ...layout, wrap: event.target.value as PageContainerWrap })}><option value="nowrap">No wrap</option><option value="wrap">Wrap items</option></select></label>
    </div> : <div className="page-style-grid">
      <label className="field"><span>Columns</span><input type="number" min="1" max="6" step="1" value={layout.columns ?? 2} onChange={(event) => onChange({ ...layout, columns: numberValue(event.target.value) })} /></label>
      <label className="field"><span>Rows</span><input type="number" min="1" max="12" step="1" value={layout.rows ?? 1} onChange={(event) => onChange({ ...layout, rows: numberValue(event.target.value) })} /></label>
      <label className="field"><span>Auto flow</span><select value={layout.autoFlow ?? "row"} onChange={(event) => onChange({ ...layout, autoFlow: event.target.value as "row" | "column" })}><option value="row">Row</option><option value="column">Column</option></select></label>
      <label className="field"><span>Justify items</span><select value={layout.justifyItems ?? "stretch"} onChange={(event) => onChange({ ...layout, justifyItems: event.target.value as PageContainerAlign })}><option value="start">Start</option><option value="center">Center</option><option value="end">End</option><option value="stretch">Stretch</option></select></label>
      <label className="field"><span>Grid outline</span><select value={layout.gridOutline ? "on" : "off"} onChange={(event) => onChange({ ...layout, gridOutline: event.target.value === "on" })}><option value="off">Hidden</option><option value="on">Show outline</option></select></label>
    </div>}
    <div className="page-style-grid">
      <label className="field"><span>Column gap</span><input type="number" min="0" max="300" value={layout.columnGap ?? 24} disabled={spacing === "global"} onChange={(event) => onChange({ ...layout, spacing: "custom", columnGap: numberValue(event.target.value) })} /><small>{spacing === "global" ? "Inherited from Site Settings." : "Pixels between columns."}</small></label>
      <label className="field"><span>Row gap</span><input type="number" min="0" max="300" value={layout.rowGap ?? 24} disabled={spacing === "global"} onChange={(event) => onChange({ ...layout, spacing: "custom", rowGap: numberValue(event.target.value) })} /><small>{spacing === "global" ? "Inherited from Site Settings." : "Pixels between rows."}</small></label>
    </div>
  </div>;
}

function RichTextFields({ block, onChange }: { block: PageBlock; onChange: (key: string, value: string | number) => void }) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const body = String(block.data.body ?? "");
  const [imageUrl, setImageUrl] = useState("");
  const [imageAlt, setImageAlt] = useState("");

  function replaceSelection(before: string, after: string) {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? body.length;
    const end = textarea?.selectionEnd ?? body.length;
    const selected = body.slice(start, end) || "selected text";
    const next = `${body.slice(0, start)}${before}${selected}${after}${body.slice(end)}`;
    onChange("body", next);
    requestAnimationFrame(() => {
      if (!textarea) return;
      textarea.focus();
      const nextStart = start + before.length;
      textarea.setSelectionRange(nextStart, nextStart + selected.length);
    });
  }

  function addImage() {
    const src = imageUrl.trim();
    if (!src) return;
    replaceSelection(`<img src="${src}" alt="${imageAlt.trim() || "Content image"}" />`, "");
    setImageUrl("");
    setImageAlt("");
  }

  return <div className="page-builder-fields"><div className="field"><label htmlFor={`page-${block.id}-heading`}>Heading</label><input id={`page-${block.id}-heading`} value={String(block.data.heading ?? "")} onChange={(event) => onChange("heading", event.target.value)} /></div><div className="rich-text-toolbar" aria-label="Rich text formatting"><button type="button" className="button button-secondary button-small" onClick={() => replaceSelection("<u>", "</u>")}><u>Underline</u></button><label className="rich-text-tool"><span>Color</span><input type="color" value={String(block.data.textColor || "#52615e")} onChange={(event) => { const color = event.target.value; onChange("textColor", color); replaceSelection(`<span style="color:${color}">`, "</span>"); }} /></label><label className="rich-text-tool"><span>Size</span><select value={String(block.data.fontSize || "medium")} onChange={(event) => { const size = event.target.value; onChange("fontSize", size); const sizes: Record<string, string> = { small: "0.9rem", medium: "1rem", large: "1.2rem", xlarge: "1.5rem" }; replaceSelection(`<span style="font-size:${sizes[size] ?? sizes.medium}">`, "</span>"); }}><option value="small">Small</option><option value="medium">Normal</option><option value="large">Large</option><option value="xlarge">Extra large</option></select></label><label className="rich-text-tool"><span>Align</span><select value={String(block.data.textAlign || "left")} onChange={(event) => onChange("textAlign", event.target.value)}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option><option value="justify">Justified</option></select></label></div><textarea ref={textareaRef} id={`page-${block.id}-body`} value={body} onChange={(event) => onChange("body", event.target.value)} placeholder="Write plain text or use the toolbar for safe formatting." /><small>Plain text and safe HTML are supported. Formatting is sanitized on save; scripts, forms, and unsafe URLs are removed.</small><div className="rich-text-image-tools"><div className="field"><label htmlFor={`page-${block.id}-image-url`}>Insert image URL</label><input id={`page-${block.id}-image-url`} type="url" value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="https://images.example.com/photo.jpg" /></div><div className="field"><label htmlFor={`page-${block.id}-image-alt`}>Image alt text</label><input id={`page-${block.id}-image-alt`} value={imageAlt} onChange={(event) => setImageAlt(event.target.value)} placeholder="Describe the image" /></div><button type="button" className="button button-secondary button-small" onClick={addImage}>Insert image</button></div></div>;
}

function BlockFields({ block, navigationMenus, forms, locations, onChange, onLayoutChange, onPreset }: { block: PageBlock; navigationMenus: NavigationMenuView[]; forms: FormDefinition[]; locations: ManagedServiceLocation[]; onChange: (key: string, value: string | number) => void; onLayoutChange: (layout: PageBlockLayout) => void; onPreset: (preset: typeof containerPresets[number]) => void }) {
  const field = (key: string, label: string, multiline = false) => <div className="field" key={key}><label htmlFor={`page-${block.id}-${key}`}>{label}</label>{multiline ? <textarea id={`page-${block.id}-${key}`} value={String(block.data[key] ?? "")} onChange={(event) => onChange(key, event.target.value)} /> : <input id={`page-${block.id}-${key}`} value={String(block.data[key] ?? "")} onChange={(event) => onChange(key, event.target.value)} />}</div>;
  if (block.type === "container") return <ContainerFields block={block} onChange={onLayoutChange} onPreset={onPreset} />;
  if (block.type === "hero") return <div className="page-builder-fields">{field("eyebrow", "Eyebrow")}{field("heading", "Heading")}{field("body", "Body copy", true)}<div className="form-row">{field("ctaLabel", "Button label")}{field("ctaHref", "Button link")}</div></div>;
  if (block.type === "heading") return <div className="page-builder-fields">{field("text", "Heading text")}<div className="form-row"><label className="field"><span>HTML tag</span><select value={String(block.data.tag ?? "h2")} onChange={(event) => onChange("tag", event.target.value)}>{["h1", "h2", "h3", "h4", "h5", "h6", "div", "span", "p"].map((tag) => <option key={tag} value={tag}>{tag.toUpperCase()}</option>)}</select></label><label className="field"><span>Alignment</span><select value={String(block.data.alignment ?? "left")} onChange={(event) => onChange("alignment", event.target.value)}><option value="left">Start</option><option value="center">Center</option><option value="right">End</option><option value="justify">Justified</option></select></label></div><div className="form-row">{field("link", "Link URL")}<label className="field"><span>Link target</span><select value={String(block.data.linkTarget ?? "same")} onChange={(event) => onChange("linkTarget", event.target.value)}><option value="same">Same window</option><option value="new">New window</option></select></label></div><label className="form-choice"><input type="checkbox" checked={String(block.data.linkNofollow ?? "no") === "yes"} onChange={(event) => onChange("linkNofollow", event.target.checked ? "yes" : "no")} /><span>Add nofollow to the heading link</span></label></div>;
  if (block.type === "rich_text") return <RichTextFields block={block} onChange={onChange} />;
  if (block.type === "image") return <div className="page-builder-fields">{field("src", "Image URL")}{field("alt", "Alt text")}{field("caption", "Caption")}<div className="form-row"><label className="field"><span>Image resolution</span><select value={String(block.data.imageResolution ?? "full")} onChange={(event) => onChange("imageResolution", event.target.value)}><option value="thumbnail">Thumbnail</option><option value="medium">Medium</option><option value="large">Large</option><option value="full">Full</option><option value="custom">Custom</option></select></label><label className="field"><span>Image link</span><select value={String(block.data.imageLinkMode ?? "none")} onChange={(event) => onChange("imageLinkMode", event.target.value)}><option value="none">None</option><option value="media">Media file</option><option value="custom">Custom URL</option></select></label></div>{String(block.data.imageLinkMode ?? "none") === "custom" ? field("imageLink", "Custom image link") : null}<small>Resolution is retained as media metadata; remote images use the source URL until a native media pipeline is connected.</small></div>;
  if (block.type === "image_box") return <div className="page-builder-fields">{field("src", "Image URL")}<div className="form-row"><label className="field"><span>Image resolution</span><select value={String(block.data.imageResolution ?? "full")} onChange={(event) => onChange("imageResolution", event.target.value)}><option value="thumbnail">Thumbnail</option><option value="medium">Medium</option><option value="large">Large</option><option value="full">Full</option><option value="custom">Custom</option></select></label>{field("imageLink", "Link")}</div>{field("title", "Title")}{field("description", "Description", true)}<label className="field"><span>Title HTML tag</span><select value={String(block.data.titleTag ?? "h3")} onChange={(event) => onChange("titleTag", event.target.value)}>{["h1", "h2", "h3", "h4", "h5", "h6", "div", "span", "p"].map((tag) => <option key={tag} value={tag}>{tag.toUpperCase()}</option>)}</select></label><small>The shared Style and Advanced controls below apply to the whole Image Box.</small></div>;
  if (block.type === "icon_box") return <div className="page-builder-fields"><div className="form-row"><label className="field"><span>Icon source</span><select value={String(block.data.iconSource ?? "fontawesome-solid")} onChange={(event) => onChange("iconSource", event.target.value)}>{iconSources.map((source) => <option key={source.value} value={source.value}>{source.label}</option>)}</select></label><label className="field"><span>View</span><select value={String(block.data.iconView ?? "framed")} onChange={(event) => onChange("iconView", event.target.value)}><option value="default">Default</option><option value="stacked">Stacked</option><option value="framed">Framed</option></select></label></div><label className="field"><span>Icon library</span><select value={String(block.data.iconName ?? "shield")} onChange={(event) => onChange("iconName", event.target.value)}>{iconNames.map((icon) => <option key={icon.value} value={icon.value}>{icon.label}</option>)}</select></label>{field("iconUrl", "Custom SVG or icon asset URL")} {field("title", "Title")}{field("description", "Description", true)}{field("link", "Link")}<label className="field"><span>Title HTML tag</span><select value={String(block.data.titleTag ?? "h3")} onChange={(event) => onChange("titleTag", event.target.value)}>{["h1", "h2", "h3", "h4", "h5", "h6", "div", "span", "p"].map((tag) => <option key={tag} value={tag}>{tag.toUpperCase()}</option>)}</select></label><small>Font Awesome source groups are represented by an allow-listed native icon catalog. Use a validated asset URL for a custom SVG; raw SVG markup is never rendered.</small></div>;
  if (block.type === "video") return <div className="page-builder-fields"><label className="field"><span>Video source</span><select value={String(block.data.source ?? "youtube")} onChange={(event) => onChange("source", event.target.value)}><option value="youtube">YouTube</option><option value="vimeo">Vimeo</option><option value="file">Hosted video file</option></select></label>{field("url", "Video URL")}<div className="form-row">{field("start", "Start time (seconds)")}{field("end", "End time (seconds)")}</div><div className="form-row">{(["autoplay", "mute", "loop", "controls"] as const).map((key) => <label className="field" key={key}><span>{key[0].toUpperCase() + key.slice(1)}</span><select value={String(block.data[key] ?? (key === "controls" ? "yes" : "no"))} onChange={(event) => onChange(key, event.target.value)}><option value="no">No</option><option value="yes">Yes</option></select></label>)}</div><div className="form-row"><label className="field"><span>Captions</span><select value={String(block.data.captions ?? "no")} onChange={(event) => onChange("captions", event.target.value)}><option value="no">Off</option><option value="yes">On</option></select></label><label className="field"><span>Privacy mode</span><select value={String(block.data.privacy ?? "yes")} onChange={(event) => onChange("privacy", event.target.value)}><option value="yes">Privacy enhanced</option><option value="no">Standard</option></select></label></div><label className="field"><span>Fallback image URL</span><input type="url" value={String(block.data.overlayImage ?? "")} onChange={(event) => onChange("overlayImage", event.target.value)} placeholder="https://images.example.com/video-cover.jpg" /></label><label className="field"><span>Fallback image alt text</span><input value={String(block.data.overlayAlt ?? "Video preview")} onChange={(event) => onChange("overlayAlt", event.target.value)} /></label><small>Only recognized YouTube, Vimeo, and HTTPS video URLs are rendered. The same widget can later expose the shared Style and Advanced panels.</small></div>;
  if (block.type === "map") {
    const locationMode = String(block.data.locationMode ?? "address") === "coordinates" ? "coordinates" : "address";
    return <div className="page-builder-fields"><label className="field"><span>Location input</span><select value={locationMode} onChange={(event) => onChange("locationMode", event.target.value)}><option value="address">Street address or place</option><option value="coordinates">Latitude and longitude</option></select></label>{locationMode === "coordinates" ? <div className="form-row"><label className="field"><span>Latitude</span><input type="number" min="-90" max="90" step="any" value={String(block.data.latitude ?? "")} onChange={(event) => onChange("latitude", event.target.value)} placeholder="32.7357" /></label><label className="field"><span>Longitude</span><input type="number" min="-180" max="180" step="any" value={String(block.data.longitude ?? "")} onChange={(event) => onChange("longitude", event.target.value)} placeholder="-97.1081" /></label></div> : <label className="field"><span>Street address or place</span><input value={String(block.data.address ?? block.data.location ?? "")} onChange={(event) => onChange("address", event.target.value)} placeholder="123 Main Street, Arlington, TX 76014" /></label>}<div className="form-row">{field("zoom", "Zoom")}{field("height", "Height (pixels)")}</div><small>Use a full street address with ZIP code, a place name, or switch to coordinates and enter latitude from -90 to 90 and longitude from -180 to 180. The published map uses a safe Google Maps embed URL and opens the full map in a separate tab.</small></div>;
  }
  if (block.type === "location_index") return <div className="page-builder-fields">{field("heading", "Section heading")}<small>This block keeps the synthetic service-area directory connected to the page while the surrounding hero, copy, CTA, and block styling remain editable.</small></div>;
  if (block.type === "location_detail") return <div className="page-builder-fields"><div className="field"><label htmlFor={`page-${block.id}-locationSlug`}>Managed service location</label><select id={`page-${block.id}-locationSlug`} value={String(block.data.locationSlug ?? "")} onChange={(event) => onChange("locationSlug", event.target.value)}><option value="">Choose a service location</option>{locations.map((location) => <option key={location.id} value={location.slug}>{location.city}, {location.region} · {location.pageStatus}</option>)}</select></div><small>This reusable template renders the selected location’s details, formats, FAQs, and related coverage links. Manage the location record separately; use this block to control where the template appears.</small></div>;
  if (block.type === "button") return <div className="page-builder-fields">{field("buttonLabel", "Button text")}{field("buttonHref", "Button link")}<div className="form-row"><label className="field"><span>Button type</span><select value={String(block.data.buttonType ?? "default")} onChange={(event) => onChange("buttonType", event.target.value)}><option value="default">Default</option><option value="info">Info</option><option value="success">Success</option><option value="warning">Warning</option><option value="danger">Danger</option></select></label>{field("buttonId", "Button ID")}</div><div className="form-row">{field("buttonIcon", "Optional icon")}<label className="field"><span>Icon position</span><select value={String(block.data.buttonIconPosition ?? "left")} onChange={(event) => onChange("buttonIconPosition", event.target.value)}><option value="left">Left</option><option value="right">Right</option></select></label></div><small>Use a short text symbol or emoji for the optional icon. Button links are limited to safe internal or HTTPS destinations when published.</small></div>;
  if (block.type === "cta") return <div className="page-builder-fields">{field("heading", "Heading")}{field("body", "Body copy", true)}<div className="form-row">{field("buttonLabel", "Button label")}{field("buttonHref", "Button link")}</div></div>;
  if (block.type === "product_grid" || block.type === "product_category" || block.type === "sale_grid") return <div className="page-builder-fields">{field("heading", "Heading")}{block.type !== "sale_grid" ? field("category", block.type === "product_category" ? "Category name" : "Optional category filter") : null}<div className="form-row">{field("columns", "Columns")}{field("itemsPerPage", "Products per page")}</div><div className="form-row"><label className="field"><span>Pagination</span><select value={String(block.data.pagination ?? "numbers")} onChange={(event) => onChange("pagination", event.target.value)}><option value="numbers">Previous and next</option><option value="none">No pagination</option></select></label><label className="field"><span>Sort products</span><select value={String(block.data.sort ?? "name-asc")} onChange={(event) => onChange("sort", event.target.value)}><option value="name-asc">Name, A to Z</option><option value="name-desc">Name, Z to A</option><option value="price-asc">Price, low to high</option><option value="price-desc">Price, high to low</option></select></label></div><details className="page-builder-advanced-section" open><summary>Card content</summary><div className="page-style-grid">{(["showImage", "showSku", "showDescription", "showPrice", "showInventory", "showButton"] as const).map((key) => <label className="form-choice" key={key}><input type="checkbox" checked={String(block.data[key] ?? "yes") !== "no"} onChange={(event) => onChange(key, event.target.checked ? "yes" : "no")} /><span>{key === "showImage" ? "Image" : key === "showSku" ? "Category and SKU" : key === "showDescription" ? "Description" : key === "showPrice" ? "Price" : key === "showInventory" ? "Availability" : "View product button"}</span></label>)}</div><div className="form-row">{field("buttonLabel", "Button label")}<label className="field"><span>Card style</span><select value={String(block.data.cardStyle ?? "card")} onChange={(event) => onChange("cardStyle", event.target.value)}><option value="card">Card</option><option value="minimal">Minimal</option></select></label></div></details><small>Columns are responsive in the published grid. Pagination uses the public Products route and keeps the selected category in the URL.</small></div>;
  if (block.type === "gallery") return <div className="page-builder-fields">{field("heading", "Heading")}{field("images", "Images", true)}<small>One image per line. Use the format: image URL | alt text | caption</small></div>;
  if (block.type === "testimonial_grid") return <div className="page-builder-fields">{field("heading", "Heading")}{field("maxItems", "Maximum testimonials")}</div>;
  if (block.type === "navigation_menu") return <div className="page-builder-fields">{field("heading", "Heading")}<div className="field"><label htmlFor={`page-${block.id}-menuId`}>Menu</label><select id={`page-${block.id}-menuId`} value={String(block.data.menuId ?? "")} onChange={(event) => onChange("menuId", event.target.value)}><option value="">Choose a saved menu</option>{navigationMenus.map((menu) => <option key={menu.id} value={menu.id}>{menu.name} · {menu.locations.join(", ")}</option>)}</select></div><div className="field"><label htmlFor={`page-${block.id}-layout`}>Layout</label><select id={`page-${block.id}-layout`} value={String(block.data.layout ?? "horizontal")} onChange={(event) => onChange("layout", event.target.value)}><option value="horizontal">Horizontal links</option><option value="stacked">Stacked links</option></select></div><small>The page uses the menu’s current labels, order, and nested items when it renders.</small></div>;
  if (block.type === "form") return <div className="page-builder-fields">{field("heading", "Heading")}<div className="field"><label htmlFor={`page-${block.id}-formSlug`}>Published form</label><select id={`page-${block.id}-formSlug`} value={String(block.data.formSlug ?? "")} onChange={(event) => onChange("formSlug", event.target.value)}><option value="">Choose a published form</option>{forms.map((form) => <option key={form.id} value={form.slug}>{form.name} · /forms/{form.slug}</option>)}</select></div><small>The page loads the form definition server-side and keeps submission validation on the form API.</small></div>;
  if (block.type === "html") return <div className="page-builder-fields">{field("html", "HTML markup", true)}<small>Safe tags, links, images, and approved YouTube or Vimeo frames are retained. Scripts, forms, and unsafe embeds are removed when the page is saved.</small></div>;
  return <div className="page-builder-fields">{field("height", "Height (pixels)")}</div>;
}

function PageBlockAdvancedFields({ block, onChange }: { block: PageBlock; onChange: (key: string, value: string | number) => void }) {
  const visibility = String(block.data.visibility ?? "all");
  return <div className="page-builder-fields page-builder-advanced-fields">
    <div className="page-container-heading"><div><strong>Advanced settings</strong><small>Optional anchors and responsive visibility for this block.</small></div><span className="page-container-badge">Optional</span></div>
    <div className="page-style-grid">
      <label className="field"><span>CSS ID</span><input id={`page-${block.id}-cssId`} value={String(block.data.cssId ?? "")} onChange={(event) => onChange("cssId", event.target.value)} placeholder="section-name" /></label>
      <label className="field"><span>Hide on</span><select id={`page-${block.id}-visibility`} value={visibility} onChange={(event) => onChange("visibility", event.target.value)}><option value="all">All devices</option><option value="desktop">Desktop</option><option value="tablet">Tablet</option><option value="mobile">Mobile</option></select></label>
    </div>
    <details className="page-builder-advanced-section"><summary>Attributes</summary><div className="page-style-grid"><label className="field"><span>ARIA label</span><input value={String(block.data.ariaLabel ?? "")} onChange={(event) => onChange("ariaLabel", event.target.value)} placeholder="Describe this section" /></label><label className="field"><span>Role</span><select value={String(block.data.role ?? "")} onChange={(event) => onChange("role", event.target.value)}><option value="">No role</option><option value="region">Region</option><option value="article">Article</option><option value="section">Section</option><option value="navigation">Navigation</option><option value="complementary">Complementary</option><option value="main">Main</option></select></label></div><label className="field"><span>Title attribute</span><input value={String(block.data.titleAttribute ?? "")} onChange={(event) => onChange("titleAttribute", event.target.value)} placeholder="Optional hover description" /></label></details>
    <details className="page-builder-advanced-section"><summary>Custom CSS</summary><label className="field"><span>Scoped CSS</span><textarea value={String(block.data.customCss ?? "")} onChange={(event) => onChange("customCss", event.target.value)} placeholder="color: #183b36;\nbackground: #f3faf7;" /></label><small>Simple selectors are scoped to this block in the live preview and published page. Unsafe imports and script-like expressions are removed.</small></details>
    <small>Use a CSS ID for an in-page anchor. The visibility choice hides this block at the selected device size in the published page and live preview.</small>
  </div>;
}

function BlockEditor({ block, path, count, navigationMenus, forms, locations, dragPath, selectedPath, onSelect, onChange, onStyleChange, onLayoutChange, onPreset, onAddChild, onMove, onDuplicate, onDelete, onDragStart, onDragEnd, onDropBefore, onDropInto }: {
  block: PageBlock;
  path: BlockPath;
  count: number;
  navigationMenus: NavigationMenuView[];
  forms?: FormDefinition[];
  locations: ManagedServiceLocation[];
  dragPath: BlockPath | null;
  selectedPath: BlockPath | null;
  onSelect: (path: BlockPath) => void;
  onChange: (path: BlockPath, key: string, value: string | number) => void;
  onStyleChange: (path: BlockPath, style: PageBlockStyle | undefined) => void;
  onLayoutChange: (path: BlockPath, layout: PageBlockLayout) => void;
  onPreset: (path: BlockPath, preset: typeof containerPresets[number]) => void;
  onAddChild: (path: BlockPath, item: BlockLibraryItem) => void;
  onMove: (path: BlockPath, offset: number) => void;
  onDuplicate: (path: BlockPath) => void;
  onDelete: (path: BlockPath) => void;
  onDragStart: (path: BlockPath) => void;
  onDragEnd: () => void;
  onDropBefore: (path: BlockPath) => void;
  onDropInto: (path: BlockPath) => void;
}) {
  const label = blockLabel(block);
  const children = block.children ?? [];
  const [childKey, setChildKey] = useState("rich_text");
  const isDragging = dragPath ? pathEquals(dragPath, path) : false;
  const isSelected = selectedPath ? pathEquals(selectedPath, path) : false;
  const displayIndex = path[path.length - 1] + 1;
  function handleDragStart(event: DragEvent<HTMLElement>) { event.stopPropagation(); onDragStart(path); }
  function handleDropBefore(event: DragEvent<HTMLElement>) { event.preventDefault(); event.stopPropagation(); onDropBefore(path); }

  return <article className={`page-builder-block ${block.type === "container" ? "page-builder-block-container" : ""} ${isDragging ? "is-dragging" : ""} ${isSelected ? "is-selected" : ""}`} draggable onClick={(event) => { event.stopPropagation(); onSelect(path); }} onDragStart={handleDragStart} onDragEnd={onDragEnd} onDragOver={(event) => event.preventDefault()} onDrop={handleDropBefore}>
    <header className="page-builder-block-header"><span className="page-builder-drag-handle" title="Drag to reorder" aria-label="Drag to reorder"><GripVertical size={16} /><strong>{displayIndex}. {label}</strong></span><div className="page-builder-block-actions"><button type="button" className="icon-button" onClick={() => onMove(path, -1)} disabled={displayIndex === 1} aria-label="Move block up"><ArrowUp size={14} /></button><button type="button" className="icon-button" onClick={() => onMove(path, 1)} disabled={displayIndex === count} aria-label="Move block down"><ArrowDown size={14} /></button><button type="button" className="icon-button" onClick={() => onDuplicate(path)} aria-label="Duplicate block"><Copy size={14} /></button><button type="button" className="icon-button icon-button-danger" onClick={() => onDelete(path)} aria-label="Delete block"><Trash2 size={14} /></button></div></header>
    {!isSelected ? <BlockFields block={block} navigationMenus={navigationMenus} forms={forms ?? []} locations={locations} onChange={(key, value) => onChange(path, key, value)} onLayoutChange={(layout) => onLayoutChange(path, layout)} onPreset={(preset) => onPreset(path, preset)} /> : <div className="page-builder-inline-selection-note">Edit this {label.toLowerCase()} in the selected-element panel on the left.</div>}
    {block.type === "container" ? <div className="page-builder-container-children" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); event.stopPropagation(); onDropInto(path); }}><div className="page-builder-children-heading"><div><strong>Nested content</strong><small>Drop blocks here or add a block to this container.</small></div><span>{children.length} {children.length === 1 ? "block" : "blocks"}</span></div>{children.length > 0 ? children.map((child, index) => <BlockEditor key={child.id} block={child} path={[...path, index]} count={children.length} navigationMenus={navigationMenus} forms={forms} locations={locations} dragPath={dragPath} selectedPath={selectedPath} onSelect={onSelect} onChange={onChange} onStyleChange={onStyleChange} onLayoutChange={onLayoutChange} onPreset={onPreset} onAddChild={onAddChild} onMove={onMove} onDuplicate={onDuplicate} onDelete={onDelete} onDragStart={onDragStart} onDragEnd={onDragEnd} onDropBefore={onDropBefore} onDropInto={onDropInto} />) : <div className="page-builder-dropzone"><Plus size={16} />Drop a block into this container</div>}<div className="page-builder-child-add"><select aria-label="Choose a nested block" value={childKey} onChange={(event) => setChildKey(event.target.value)}>{blockLibrary.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select><button type="button" className="button button-secondary button-small" onClick={() => { const item = blockLibrary.find((candidate) => candidate.key === childKey); if (item) onAddChild(path, item); }}><Plus size={14} /> Add nested block</button></div></div> : null}
    {!isSelected ? <PageBlockStyleFields block={block} onChange={(style) => onStyleChange(path, style)} /> : null}
  </article>;
}

export function PageBuilder({ page, navigationMenus = [], forms = [], locations = [] }: { page?: ContentPage; navigationMenus?: NavigationMenuView[]; forms?: FormDefinition[]; locations?: ManagedServiceLocation[] }) {
  const router = useRouter();
  const previewCanvasRef = useRef<HTMLDivElement>(null);
  const [title, setTitle] = useState(() => page?.title ?? "");
  const [slug, setSlug] = useState(() => page?.slug ?? "");
  const [excerpt, setExcerpt] = useState(() => page?.excerpt ?? "");
  const [status, setStatus] = useState<PageStatus>(() => page?.status ?? "draft");
  const [isHomepage, setIsHomepage] = useState(() => page?.isHomepage ?? false);
  const [seoTitle, setSeoTitle] = useState(() => page?.seoTitle ?? "");
  const [seoDescription, setSeoDescription] = useState(() => page?.seoDescription ?? "");
  const [blocks, setBlocks] = useState<PageBlock[]>(() => page?.blocks ?? []);
  const [dragPath, setDragPath] = useState<BlockPath | null>(null);
  const [paletteDragKey, setPaletteDragKey] = useState<string | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [selectedPanel, setSelectedPanel] = useState<"content" | "style" | "advanced">("content");
  const [pageSettingsOpen, setPageSettingsOpen] = useState(false);
  const [seoOpen, setSeoOpen] = useState(false);
  const [selectionBox, setSelectionBox] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const [contextMenu, setContextMenu] = useState<{ blockId: string; top: number; left: number } | null>(null);
  const [preview, setPreview] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const selectedPath = selectedBlockId ? findBlockPath(blocks, selectedBlockId) : null;
  const selectedBlock = selectedPath ? getBlockAtPath(blocks, selectedPath) : undefined;

  function selectBlock(blockId: string | null) {
    setSelectedBlockId(blockId);
    setSelectedPanel("content");
    setPageSettingsOpen(false);
    setSeoOpen(false);
    setContextMenu(null);
  }

  useEffect(() => {
    if (!contextMenu) return;
    function closeContextMenu() { setContextMenu(null); }
    function closeOnEscape(event: KeyboardEvent) { if (event.key === "Escape") closeContextMenu(); }
    document.addEventListener("click", closeContextMenu);
    document.addEventListener("contextmenu", closeContextMenu);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("click", closeContextMenu);
      document.removeEventListener("contextmenu", closeContextMenu);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [contextMenu]);

useLayoutEffect(() => {
  const canvasElement = previewCanvasRef.current;
  if (!canvasElement || !selectedBlockId || !preview) {
    setSelectionBox(null);
    return;
  }
  const canvas = canvasElement;
    let frameRequest: number | null = null;
    function updateSelectionBox() {
      if (frameRequest !== null) cancelAnimationFrame(frameRequest);
      frameRequest = requestAnimationFrame(() => {
        const frame = Array.from(canvas.querySelectorAll<HTMLElement>("[data-page-block-id]")).find((element) => element.dataset.pageBlockId === selectedBlockId);
        const element = frame?.firstElementChild as HTMLElement | null;
        if (!element) {
          setSelectionBox(null);
          return;
        }
        const elementRect = element.getBoundingClientRect();
        const canvasRect = canvas.getBoundingClientRect();
        const next = { top: elementRect.top - canvasRect.top, left: elementRect.left - canvasRect.left, width: elementRect.width, height: elementRect.height };
        setSelectionBox((current) => current && Object.keys(next).every((key) => Math.abs(current[key as keyof typeof next] - next[key as keyof typeof next]) < 0.5) ? current : next);
      });
    }
    updateSelectionBox();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updateSelectionBox);
    observer?.observe(canvas);
    const targetFrame = Array.from(canvas.querySelectorAll<HTMLElement>("[data-page-block-id]")).find((element) => element.dataset.pageBlockId === selectedBlockId);
    if (targetFrame?.firstElementChild) observer?.observe(targetFrame.firstElementChild);
    window.addEventListener("resize", updateSelectionBox, { passive: true });
    const scroller = canvas.parentElement;
    scroller?.addEventListener("scroll", updateSelectionBox, { passive: true });
    return () => {
      if (frameRequest !== null) cancelAnimationFrame(frameRequest);
      observer?.disconnect();
      window.removeEventListener("resize", updateSelectionBox);
      scroller?.removeEventListener("scroll", updateSelectionBox);
    };
  }, [blocks, preview, selectedBlockId]);

  function nearestContainerPath(path: BlockPath | null): BlockPath | null {
    if (!path) return null;
    for (let length = path.length; length > 0; length -= 1) {
      const candidatePath = path.slice(0, length);
      if (getBlockAtPath(blocks, candidatePath)?.type === "container") return candidatePath;
    }
    return null;
  }

  function addBlock(item: BlockLibraryItem) {
    const block = newBlockFromLibrary(item);
    const parentPath = item.category === "basic" ? nearestContainerPath(selectedPath) : null;
    setBlocks((current) => {
      const parent = parentPath ? getBlockAtPath(current, parentPath) : undefined;
      if (item.category === "basic" && parent?.type === "container") {
        return updateBlockAtPath(current, parentPath as BlockPath, (currentParent) => ({ ...currentParent, children: [...(currentParent.children ?? []), block] }));
      }
      return item.category === "basic" ? [...current, makeAutoContainer(block)] : [...current, block];
    });
    selectBlock(block.id);
    setMessage("");
  }

  function addChild(path: BlockPath, item: BlockLibraryItem) {
    const block = newBlockFromLibrary(item);
    setBlocks((current) => updateBlockAtPath(current, path, (parent) => parent.type === "container" ? { ...parent, children: [...(parent.children ?? []), block] } : parent));
    selectBlock(block.id);
    setMessage("");
  }

  function updateBlock(path: BlockPath, key: string, value: string | number) { setBlocks((current) => updateBlockAtPath(current, path, (block) => updateBlockData(block, key, value))); }
  function updateBlockStyle(path: BlockPath, style: PageBlockStyle | undefined) { setBlocks((current) => updateBlockAtPath(current, path, (block) => ({ ...block, style }))); }
  function updateBlockLayout(path: BlockPath, layout: PageBlockLayout) { setBlocks((current) => updateBlockAtPath(current, path, (block) => ({ ...block, layout }))); }
  function applyPreset(path: BlockPath, preset: typeof containerPresets[number]) {
    setBlocks((current) => updateBlockAtPath(current, path, (block) => {
      if (block.type !== "container") return block;
      const children = (block.children?.length ?? 0) > 0 ? block.children : Array.from({ length: preset.slots }, (_, index) => makeColumnContainer(preset.widths?.[index]));
      return { ...block, layout: { ...block.layout, ...preset.layout, spacing: block.layout?.spacing ?? "global", contentWidth: block.layout?.contentWidth ?? "boxed", justifyContent: block.layout?.justifyContent ?? "start", alignItems: block.layout?.alignItems ?? "stretch", columnGap: block.layout?.spacing === "custom" ? block.layout.columnGap : undefined, rowGap: block.layout?.spacing === "custom" ? block.layout.rowGap : undefined, wrap: block.layout?.wrap ?? "nowrap" }, children };
    }));
  }
  function moveBlock(path: BlockPath, offset: number) { setBlocks((current) => moveWithinParent(current, path, offset)); }
  function duplicateBlock(path: BlockPath) { setBlocks((current) => { const source = getBlockAtPath(current, path); if (!source) return current; const clone = cloneBlock(source); selectBlock(clone.id); return insertAfterPath(current, path, clone); }); }
  function deleteBlock(path: BlockPath) { setBlocks((current) => removeBlockAtPath(current, path).blocks); if (selectedPath && (pathEquals(path, selectedPath) || isPathPrefix(path, selectedPath))) selectBlock(null); }
  function dropBefore(targetPath: BlockPath) {
    if (!dragPath) return;
    setBlocks((current) => {
      const source = getBlockAtPath(current, dragPath);
      if (source?.type !== "container" && targetPath.length === 1) return current;
      return moveBlockBefore(current, dragPath as BlockPath, targetPath);
    });
    setDragPath(null);
  }
  function dropInto(targetPath: BlockPath) { if (!dragPath) return; setBlocks((current) => moveBlockInto(current, dragPath, targetPath)); setDragPath(null); }

  function handleLibraryDragStart(event: DragEvent<HTMLButtonElement>, item: BlockLibraryItem) {
    event.stopPropagation();
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData("application/x-webinar-block", item.key);
    setPaletteDragKey(item.key);
  }

  function handleLibraryDragEnd() { setPaletteDragKey(null); }

  function previewFrameFromEvent(event: DragEvent<HTMLDivElement> | MouseEvent<HTMLDivElement>): HTMLElement | null {
    const target = event.target;
    return target instanceof Element ? target.closest<HTMLElement>("[data-page-block-id]") : null;
  }

  function previewTargetPath(frame: HTMLElement | null): BlockPath | null {
    return frame?.dataset.pageBlockId ? findBlockPath(blocks, frame.dataset.pageBlockId) : null;
  }

  function previewContainerPath(frame: HTMLElement | null, targetPath: BlockPath | null): BlockPath | null {
    const containerFrame = frame?.dataset.pageBlockType === "container" ? frame : frame?.closest<HTMLElement>('[data-page-block-type="container"]');
    const containerPath = containerFrame?.dataset.pageBlockId ? findBlockPath(blocks, containerFrame.dataset.pageBlockId) : null;
    return containerPath ?? nearestContainerPath(targetPath);
  }

  function handlePreviewClick(event: MouseEvent<HTMLDivElement>) {
    const frame = previewFrameFromEvent(event);
    const path = previewTargetPath(frame);
    if (!path || !frame?.dataset.pageBlockId) return;
    event.preventDefault();
    event.stopPropagation();
    selectBlock(frame.dataset.pageBlockId);
  }

  function handlePreviewContextMenu(event: MouseEvent<HTMLDivElement>) {
    const frame = previewFrameFromEvent(event);
    if (!frame?.dataset.pageBlockId) return;
    event.preventDefault();
    event.stopPropagation();
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const canvasRect = canvas.getBoundingClientRect();
    const menuWidth = 190;
    const menuHeight = 142;
    const left = Math.max(8, Math.min(event.clientX - canvasRect.left + canvas.scrollLeft, canvas.scrollWidth - menuWidth - 8));
    const top = Math.max(8, Math.min(event.clientY - canvasRect.top + canvas.scrollTop, canvas.scrollHeight - menuHeight - 8));
    setContextMenu({ blockId: frame.dataset.pageBlockId, top, left });
  }

  function handlePreviewDragOver(event: DragEvent<HTMLDivElement>) {
    const isPaletteDrag = Boolean(paletteDragKey) || event.dataTransfer.types.includes("application/x-webinar-block");
    if (!isPaletteDrag && !dragPath) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = isPaletteDrag ? "copy" : "move";
  }

  function handlePreviewDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    const frame = previewFrameFromEvent(event);
    const targetPath = previewTargetPath(frame);
    const containerPath = previewContainerPath(frame, targetPath);
    const libraryKey = paletteDragKey || event.dataTransfer.getData("application/x-webinar-block");
    if (libraryKey) {
      const item = blockLibrary.find((candidate) => candidate.key === libraryKey);
      if (!item) return;
      const block = newBlockFromLibrary(item);
      setBlocks((current) => {
        if (containerPath && getBlockAtPath(current, containerPath)?.type === "container") {
          return updateBlockAtPath(current, containerPath, (parent) => ({ ...parent, children: [...(parent.children ?? []), block] }));
        }
        if (item.category === "basic") {
          const container = makeAutoContainer(block);
          return targetPath?.length === 1 ? insertAfterPath(current, targetPath, container) : [...current, container];
        }
        return targetPath?.length === 1 ? insertAfterPath(current, targetPath, block) : [...current, block];
      });
      selectBlock(block.id);
      setPaletteDragKey(null);
      setMessage("");
      return;
    }
    if (!dragPath) return;
    setBlocks((current) => containerPath ? moveBlockInto(current, dragPath, containerPath) : targetPath ? moveBlockBefore(current, dragPath, targetPath) : current);
    setDragPath(null);
  }

  async function save() {
    setSaving(true); setError(""); setMessage("");
    try {
      const response = await fetch(page ? `/api/admin/pages/${encodeURIComponent(page.id)}` : "/api/admin/pages", { method: page ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, slug: slug || slugify(title), excerpt, status, isHomepage, blocks, seoTitle, seoDescription }) });
      const data = await response.json() as { page?: { id: string; slug: string }; error?: string };
      if (!response.ok || !data.page) throw new Error(data.error ?? "The page could not be saved.");
      if (!page) router.push(`/admin/pages/${data.page.id}/edit`);
      else setMessage("Page saved.");
    } catch (failure) { setError(failure instanceof Error ? failure.message : "The page could not be saved."); } finally { setSaving(false); }
  }

  const selectedEditLabel = selectedBlock?.type === "container" ? "Edit container" : selectedBlock ? `Edit ${blockLabel(selectedBlock).toLowerCase()}` : "Edit element";

  return (
    <div className="page-builder">
      <div className="page-builder-toolbar">
        <div>
          <span className="eyebrow">Visual page editor</span>
          <h1 className="page-title">{page ? "Edit page" : "Create a page"}</h1>
          <p className="page-subtitle">Compose reusable blocks, choose Flexbox or Grid structures, drag nested blocks into place, then publish when the page is ready.</p>
        </div>
        <div className="detail-actions">
          <Link href="/admin/pages" className="button button-secondary"><ArrowLeft size={14} /> Pages</Link>
          <button type="button" className={preview ? "button button-secondary button-active" : "button button-secondary"} onClick={() => setPreview((current) => !current)} aria-pressed={preview}>{preview ? "Hide preview" : "Show preview"}</button>
          <button className="button" type="button" onClick={() => void save()} disabled={saving}><Save size={14} />{saving ? "Saving…" : "Save page"}</button>
        </div>
      </div>
      <div className="page-builder-layout">
        <aside className="page-builder-sidebar" aria-label="Page tools and settings">
          <div className="page-builder-page-name" aria-label="Current page"><h2>{title || "Untitled page"}</h2><span>{slug ? `/${slug}` : "No slug yet"}</span></div>
          {!selectedBlock ? <section className="panel page-block-library">
            <div className="panel-header">
              <div><span className="eyebrow">Elements</span><h2 className="panel-title">Add content</h2><p className="page-builder-library-help">Start with a container, or drop a widget below a section to create a full-width container automatically.</p></div>
              <span className="page-builder-block-count">{blockLibrary.length}</span>
            </div>
            <div className="page-builder-panel-tabs" aria-label="Element categories"><span className="is-active">Widgets</span><span>Globals</span></div>
            {(["layout", "basic"] as const).map((category) => <div className="page-builder-library-group" key={category}><div className="page-builder-library-group-heading"><span>{category === "layout" ? "Layout" : "Basic"}</span><small>{category === "layout" ? "Start with a container" : "Drop inside, or create one below"}</small></div>{blockLibrary.filter((item) => item.category === category).map((item) => { const Icon = item.icon; return <button type="button" draggable aria-label={`${item.label}: ${item.description}`} title={item.description} className={`page-block-library-item ${paletteDragKey === item.key ? "is-dragging" : ""}`} key={item.key} onClick={() => addBlock(item)} onDragStart={(event) => handleLibraryDragStart(event, item)} onDragEnd={handleLibraryDragEnd}><span className="page-block-icon"><Icon size={18} /></span><span><strong>{item.shortLabel ?? item.label}</strong><small>{item.description}</small></span><ArrowRight size={14} /></button>; })}</div>)}
          </section> : null}
          {selectedBlock && selectedPath ? <section className="panel page-builder-selected-inspector" aria-label="Selected element settings">
            <div className="panel-header page-builder-inspector-header"><div><span className="eyebrow">Selected element</span><h2 className="panel-title">{blockLabel(selectedBlock)}</h2><small className="row-meta">Edit the selected item from the live canvas.</small></div><button type="button" className="icon-button" aria-label="Clear selected element" onClick={() => selectBlock(null)}><X size={15} /></button></div>
            <div className="page-builder-selected-view-switcher" role="tablist" aria-label="Selected element controls"><button type="button" role="tab" aria-selected={selectedPanel === "content"} className={selectedPanel === "content" ? "is-active" : ""} onClick={() => setSelectedPanel("content")}>{selectedBlock.type === "container" ? "Layout" : "Content"}</button><button type="button" role="tab" aria-selected={selectedPanel === "style"} className={selectedPanel === "style" ? "is-active" : ""} onClick={() => setSelectedPanel("style")}>Style</button><button type="button" role="tab" aria-selected={selectedPanel === "advanced"} className={selectedPanel === "advanced" ? "is-active" : ""} onClick={() => setSelectedPanel("advanced")}>Advanced</button></div>
            {selectedPanel === "content" ? <BlockFields block={selectedBlock} navigationMenus={navigationMenus} forms={forms} locations={locations} onChange={(key, value) => updateBlock(selectedPath, key, value)} onLayoutChange={(layout) => updateBlockLayout(selectedPath, layout)} onPreset={(preset) => applyPreset(selectedPath, preset)} /> : selectedPanel === "style" ? <PageBlockStyleFields block={selectedBlock} onChange={(style) => updateBlockStyle(selectedPath, style)} /> : <PageBlockAdvancedFields block={selectedBlock} onChange={(key, value) => updateBlock(selectedPath, key, value)} />}
          </section> : null}
          {!selectedBlock || selectedPanel === "content" ? <>
            <details className="panel page-builder-collapsible-panel" open={pageSettingsOpen} onToggle={(event) => setPageSettingsOpen(event.currentTarget.open)}>
              <summary className="page-builder-collapsible-summary"><span><span className="eyebrow">Page settings</span><strong>Page setup</strong></span></summary>
              <div className="page-builder-settings">
                <div className="field"><label htmlFor="page-title">Page title</label><input id="page-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="About our studio" required /></div>
                <div className="field"><label htmlFor="page-slug">URL slug</label><input id="page-slug" value={slug} onChange={(event) => setSlug(slugify(event.target.value))} placeholder="about-our-studio" required={Boolean(page)} /><small>Public URL: {publicPath(slug || slugify(title), isHomepage)}</small></div>
                <div className="field"><label htmlFor="page-status">Publishing state</label><select id="page-status" value={status} onChange={(event) => { const next = event.target.value as PageStatus; setStatus(next); if (next !== "published") setIsHomepage(false); }}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></div>
                <div className="field"><label htmlFor="page-excerpt">Excerpt</label><input id="page-excerpt" value={excerpt} onChange={(event) => setExcerpt(event.target.value)} placeholder="A short summary for listings and previews." /></div>
                <div className="page-homepage-control"><label className="form-choice" htmlFor="page-homepage"><input id="page-homepage" type="checkbox" checked={isHomepage} disabled={status !== "published"} onChange={(event) => setIsHomepage(event.target.checked)} /><span><strong>Use this page as the homepage</strong><small>Published pages marked here appear at the site root. Saving a different page moves the homepage designation.</small></span></label>{isHomepage ? <span className="page-home-badge">Current homepage</span> : null}</div>
              </div>
            </details>
            <details className="panel page-seo-panel page-builder-collapsible-panel" open={seoOpen} onToggle={(event) => setSeoOpen(event.currentTarget.open)}>
              <summary className="page-builder-collapsible-summary"><span><span className="eyebrow">Search appearance</span><strong>SEO fields</strong></span></summary>
              <div className="form-grid"><div className="field"><label htmlFor="page-seo-title">SEO title</label><input id="page-seo-title" value={seoTitle} onChange={(event) => setSeoTitle(event.target.value)} placeholder={title || "Page title"} /></div><div className="field"><label htmlFor="page-seo-description">SEO description</label><textarea id="page-seo-description" value={seoDescription} onChange={(event) => setSeoDescription(event.target.value)} placeholder={excerpt || "Search description"} /></div></div>
            </details>
          </> : null}
        </aside>
        <section className="page-builder-main" aria-label="Page canvas">
          <div className="page-builder-stage-header"><div><span className="eyebrow">Live canvas</span><h2 className="panel-title">{page ? "Edit your page" : "Build your page"}</h2></div><span className="row-meta">{blocks.length} top-level block{blocks.length === 1 ? "" : "s"}</span></div>
          {preview ? <div className="page-preview-panel page-builder-live-preview" onClick={handlePreviewClick} onContextMenu={handlePreviewContextMenu} onDragOver={handlePreviewDragOver} onDrop={handlePreviewDrop}>
            <div className="page-preview-label"><span className="eyebrow">Live preview</span><span>{selectedBlock ? `${blockLabel(selectedBlock)} selected` : "Click a section to edit"}</span></div>
            <div className="page-preview-canvas-shell" ref={previewCanvasRef}>
              {blocks.length > 0 ? <PageRenderer blocks={blocks} navigationMenus={navigationMenus} forms={forms} locations={locations} editorMode /> : <div className="page-preview-empty"><LayoutTemplate size={22} /><strong>Start with a layout</strong><span>Drag Container or Grid here, or drop a widget to create a full-width container.</span></div>}
              {selectedBlock && selectedPath && selectionBox ? <div className="page-preview-selection" style={{ top: selectionBox.top, left: selectionBox.left, width: selectionBox.width, height: selectionBox.height }} aria-label={`${blockLabel(selectedBlock)} selected`}><div className="page-preview-selection-handle" onClick={(event) => event.stopPropagation()}><button type="button" className="page-preview-selection-edit" aria-label={selectedEditLabel} title={selectedEditLabel} data-tooltip={selectedEditLabel} onClick={() => selectBlock(selectedBlock.id)}><Pencil size={13} aria-hidden="true" /></button><button type="button" className="page-preview-selection-delete" aria-label={`Delete ${blockLabel(selectedBlock).toLowerCase()}`} title="Delete" data-tooltip="Delete" onClick={() => deleteBlock(selectedPath)}><X size={14} aria-hidden="true" /></button></div></div> : null}
              {contextMenu ? (() => {
                const contextPath = findBlockPath(blocks, contextMenu.blockId);
                const contextBlock = contextPath ? getBlockAtPath(blocks, contextPath) : undefined;
                if (!contextPath || !contextBlock) return null;
                return <div className="page-builder-context-menu" style={{ top: contextMenu.top, left: contextMenu.left }} role="menu" aria-label={`${blockLabel(contextBlock)} actions`} onClick={(event) => event.stopPropagation()}>
                  <button type="button" role="menuitem" onClick={() => selectBlock(contextBlock.id)}><Pencil size={13} />Edit {blockLabel(contextBlock).toLowerCase()}</button>
                  <button type="button" role="menuitem" onClick={() => { duplicateBlock(contextPath); setContextMenu(null); }}><Copy size={13} />Duplicate</button>
                  <button type="button" role="menuitem" className="is-danger" onClick={() => { deleteBlock(contextPath); setContextMenu(null); }}><Trash2 size={13} />Delete</button>
                </div>;
              })() : null}
            </div>
          </div> : null}
          <div className="page-builder-build-header"><div><span className="eyebrow">Drag and drop</span><strong>Page structure</strong><small>Drag blocks to reorder sections, then edit their content below.</small></div><span className="page-builder-build-count">{blocks.length}</span></div>
          <div className="page-builder-canvas" aria-label="Draggable page blocks">{blocks.length === 0 ? <div className="page-builder-empty"><Plus size={20} /><h2>Start building your page</h2><p>Choose Container or Grid from Elements, then drag content into it on the live canvas.</p></div> : blocks.map((block, index) => <BlockEditor key={block.id} block={block} path={[index]} count={blocks.length} navigationMenus={navigationMenus} forms={forms} locations={locations} dragPath={dragPath} selectedPath={selectedPath} onSelect={(path) => { const selected = getBlockAtPath(blocks, path); if (selected) selectBlock(selected.id); }} onChange={updateBlock} onStyleChange={updateBlockStyle} onLayoutChange={updateBlockLayout} onPreset={applyPreset} onAddChild={addChild} onMove={moveBlock} onDuplicate={duplicateBlock} onDelete={deleteBlock} onDragStart={setDragPath} onDragEnd={() => setDragPath(null)} onDropBefore={dropBefore} onDropInto={dropInto} />)}</div>
          {error ? <p className="form-error" role="alert">{error}</p> : null}
          {message ? <p className="form-success" role="status">{message}</p> : null}
        </section>
      </div>
    </div>
  );
}
