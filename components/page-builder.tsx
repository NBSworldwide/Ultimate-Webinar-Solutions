"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ComponentType, type DragEvent, type MouseEvent, type ReactNode } from "react";
import { AlignCenter, AlignJustify, AlignLeft, AlignRight, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Bold, ClipboardPenLine, Code2, Copy, GripVertical, Image, Italic, LayoutTemplate, List, ListOrdered, MapPin, MapPinned, Menu, Megaphone, Minus, MousePointerClick, Package, Pencil, Plus, Quote, Redo2, RemoveFormatting, Save, Strikethrough, Trash2, Type, Underline, Undo2, Video, X } from "lucide-react";
import Link from "next/link";
import { PageRenderer } from "@/components/page-renderer";
import { PageBlockStyleFields } from "@/components/page-block-style-fields";
import { PageBlockAdvancedStyleFields } from "@/components/page-block-advanced-style-fields";
import { MediaPicker } from "@/components/media-picker";
import { sanitizeHtml } from "@/lib/sanitize-html";
import { PAGE_STYLE_DEVICES } from "@/lib/page-styles";
import type { NavigationMenuView } from "@/lib/navigation";
import type { ManagedServiceLocation } from "@/lib/service-locations";
import type {
  ContentPage,
  PageBlock,
  PageBlockLayout,
  PageBlockLayoutResponsive,
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
  PageStyleDevice,
  PageStyleBox,
  PageStyleEdges,
  PageStatus,
  FormDefinition,
  SiteTemplate,
} from "@/lib/types";
import { useRouter } from "next/navigation";

type BlockPath = number[];
function isFallbackSiteTemplate(template: Pick<SiteTemplate, "id"> | null | undefined): boolean {
  return Boolean(template?.id.startsWith("fallback-"));
}

type LibraryCategory = "layout" | "basic";
type BlockLibraryItem = { key: string; type: PageBlockType; label: string; shortLabel?: string; description: string; icon: ComponentType<{ size?: number }>; category: LibraryCategory; layoutMode?: PageContainerMode };

const blockLibrary: BlockLibraryItem[] = [
  { key: "container", type: "container", label: "Container", description: "Build a nested Flexbox layout.", icon: ContainerTileIcon, category: "layout", layoutMode: "flex" },
  { key: "grid", type: "container", label: "Grid", description: "Create responsive grid columns.", icon: GridTileIcon, category: "layout", layoutMode: "grid" },
  { key: "hero", type: "hero", label: "Hero", description: "Lead with a headline and call to action.", icon: LayoutTemplate, category: "basic" },
  { key: "heading", type: "heading", label: "Heading", description: "Add a semantic heading with optional link.", icon: HeadingTileIcon, category: "basic" },
  { key: "rich_text", type: "rich_text", label: "Text editor", shortLabel: "Text", description: "Add formatted copy with a visual editor.", icon: TextTileIcon, category: "basic" },
  { key: "image", type: "image", label: "Image", description: "Show a hosted image with alt text.", icon: Image, category: "basic" },
  { key: "image_box", type: "image_box", label: "Image box", description: "Combine an image, title, description, and link.", icon: ImageBoxTileIcon, category: "basic" },
  { key: "icon", type: "icon", label: "Icon", description: "Add a standalone library or custom SVG icon.", icon: IconTileIcon, category: "basic" },
  { key: "icon_box", type: "icon_box", label: "Icon box", description: "Use a library icon with supporting content.", icon: IconBoxTileIcon, category: "basic" },
  { key: "video", type: "video", label: "Video", description: "Embed a YouTube, Vimeo, or hosted video.", icon: Video, category: "basic" },
  { key: "map", type: "map", label: "Google Maps", description: "Show a location with a safe map embed.", icon: MapPinned, category: "basic" },
  { key: "location_index", type: "location_index", label: "Service locations", shortLabel: "Locations", description: "Show the editable page's live service-area directory.", icon: LocationsTileIcon, category: "basic" },
  { key: "location_detail", type: "location_detail", label: "Service location template", shortLabel: "Location", description: "Render a managed service-area detail page.", icon: MapPin, category: "basic" },
  { key: "button", type: "button", label: "Button", description: "Add a styled link or call to action.", icon: MousePointerClick, category: "basic" },
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

function LocationsTileIcon({ size = 18 }: { size?: number }) {
  const pinSize = Math.max(9, Math.round(size * 0.58));
  return <span className="page-block-location-icon" aria-hidden="true" style={{ width: size, height: size }}><MapPin size={pinSize} strokeWidth={2.2} style={{ left: 0, top: Math.round(size * 0.35) }} /><MapPin size={pinSize} strokeWidth={2.2} style={{ left: Math.round(size * 0.28), top: 0 }} /><MapPin size={pinSize} strokeWidth={2.2} style={{ left: Math.round(size * 0.5), top: Math.round(size * 0.3) }} /></span>;
}

function TileSvg({ size = 18, children }: { size?: number; children: ReactNode }) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{children}</svg>;
}

function ContainerTileIcon({ size = 18 }: { size?: number }) {
  return <TileSvg size={size}><rect x="3" y="4" width="18" height="16" rx="1.5" /><path d="M7 8h10M7 12h10M7 16h6" /></TileSvg>;
}

function GridTileIcon({ size = 18 }: { size?: number }) {
  return <TileSvg size={size}><rect x="3" y="3" width="8" height="8" rx="1" /><rect x="13" y="3" width="8" height="8" rx="1" /><rect x="3" y="13" width="8" height="8" rx="1" /><rect x="13" y="13" width="8" height="8" rx="1" /></TileSvg>;
}

function HeadingTileIcon({ size = 18 }: { size?: number }) {
  return <TileSvg size={size}><path d="M5 5h14M12 5v14M8.5 19h7" /></TileSvg>;
}

function TextTileIcon({ size = 18 }: { size?: number }) {
  return <TileSvg size={size}><path d="M4 6h16M4 10h16M4 14h12M4 18h8" /></TileSvg>;
}

function ImageBoxTileIcon({ size = 18 }: { size?: number }) {
  return <TileSvg size={size}><rect x="3" y="3" width="18" height="11" rx="1.5" /><circle cx="8" cy="7" r="1.3" /><path d="m4 13 4-4 3 3 2-2 7 5M4 18h13M4 21h10" /></TileSvg>;
}

function IconBoxTileIcon({ size = 18 }: { size?: number }) {
  return <TileSvg size={size}><circle cx="9" cy="8" r="4.5" /><path d="m9 5.5.8 1.7 1.7.2-1.3 1.2.4 1.8L9 9.5l-1.6.9.4-1.8-1.3-1.2 1.7-.2L9 5.5ZM4 16h16M4 20h11" /></TileSvg>;
}

function IconTileIcon({ size = 18 }: { size?: number }) {
  return <TileSvg size={size}><circle cx="12" cy="12" r="7" /><path d="m12 7 1.5 3.5L17 12l-3.5 1.5L12 17l-1.5-3.5L7 12l3.5-1.5L12 7Z" /></TileSvg>;
}

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
    : type === "heading" ? { text: "A clear section heading", tag: "h2", link: "", linkTarget: "same", linkNofollow: "no", linkAttributes: "" }
      : type === "rich_text" ? { heading: "A useful section", body: "Add the supporting content your visitors need here.", textColor: "", fontSize: "medium", textAlign: "left" }
      : type === "image" ? { src: "", alt: "", caption: "", imageResolution: "full", imageLinkMode: "none", imageLink: "" }
        : type === "image_box" ? { src: "", imageResolution: "full", title: "Feature title", description: "Describe this feature for your visitors.", imageLink: "", titleTag: "h3" }
          : type === "icon" ? { iconSource: "fontawesome-solid", iconName: "sparkles", iconView: "default", iconUrl: "", link: "", linkTarget: "same", linkNofollow: "no" }
            : type === "icon_box" ? { iconSource: "fontawesome-solid", iconName: "shield", iconView: "framed", iconUrl: "", title: "Feature title", description: "Describe this feature for your visitors.", link: "", titleTag: "h3" }
          : type === "video" ? { source: "youtube", url: "", start: 0, end: 0, autoplay: "no", mute: "no", loop: "no", controls: "yes", captions: "no", captionsUrl: "", suggestedVideos: "no", privacy: "yes", lazy: "yes", overlay: "hide", overlayPlayIcon: "yes", overlayLightbox: "no", overlayImage: "", overlayAlt: "Video preview" }
          : type === "map" ? { locationMode: "address", address: "", latitude: "", longitude: "", zoom: 10, height: 360, showPlaceCard: "no", placeQuery: "" }
                              : type === "location_index" ? { heading: "Sample service locations" }
                                : type === "location_detail" ? { locationSlug: "" }
              : type === "button" ? { buttonLabel: "Explore sessions", buttonHref: "/webinars", buttonType: "default", buttonIcon: "", buttonIconPosition: "left", buttonId: "" }
              : type === "cta" ? { graphicType: "none", graphicImage: "", graphicIcon: "sparkles", heading: "Ready for the next step?", titleTag: "h2", body: "Give visitors one clear action to take next.", descriptionTag: "p", buttonLabel: "Contact us", buttonHref: "/login", buttonTarget: "same", buttonNofollow: "no", ribbonText: "Next step" }
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
      <label className="field"><span>Spacing preset</span><select value={spacing} onChange={(event) => { const next = event.target.value as PageContainerSpacing; onChange({ ...layout, spacing: next, columnGap: next === "global" ? undefined : layout.columnGap ?? 20, rowGap: next === "global" ? undefined : layout.rowGap ?? 20 }); }}><option value="global">Global site preset</option><option value="custom">Custom for this container</option></select><small>Global uses Site Settings padding and gap defaults.</small></label>
      <label className="field"><span>Content width</span><select value={layout.contentWidth ?? "boxed"} onChange={(event) => onChange({ ...layout, contentWidth: event.target.value as PageContainerContentWidth })}><option value="boxed">Boxed</option><option value="full">Full width</option></select></label>
      <label className="field"><span>Width</span><input type="range" min="0" max="3000" value={layout.width ?? 1200} onChange={(event) => onChange({ ...layout, width: numberValue(event.target.value) })} /><span className="page-container-measure"><input type="number" min="0" max="3000" value={layout.width ?? ""} onChange={(event) => onChange({ ...layout, width: numberValue(event.target.value) })} /><select aria-label="Width unit" value={layout.widthUnit ?? "px"} onChange={(event) => onChange({ ...layout, widthUnit: event.target.value as PageContainerMeasureUnit })}>{["px", "%", "em", "rem", "vw"].map((unit) => <option key={unit} value={unit}>{unit}</option>)}</select></span></label>
      <label className="field"><span>Minimum height</span><input type="range" min="0" max="3000" value={layout.minHeight ?? 480} onChange={(event) => onChange({ ...layout, minHeight: numberValue(event.target.value) })} /><span className="page-container-measure"><input type="number" min="0" max="3000" value={layout.minHeight ?? ""} onChange={(event) => onChange({ ...layout, minHeight: numberValue(event.target.value) })} /><select aria-label="Minimum height unit" value={layout.minHeightUnit ?? "px"} onChange={(event) => onChange({ ...layout, minHeightUnit: event.target.value as PageContainerMeasureUnit })}>{["px", "em", "rem", "vh"].map((unit) => <option key={unit} value={unit}>{unit}</option>)}</select></span></label>
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
      <label className="field"><span>Column gap</span><input type="number" min="0" max="300" value={layout.columnGap ?? 20} disabled={spacing === "global"} onChange={(event) => onChange({ ...layout, spacing: "custom", columnGap: numberValue(event.target.value) })} /><small>{spacing === "global" ? "Inherited from Site Settings." : "Pixels between columns."}</small></label>
      <label className="field"><span>Row gap</span><input type="number" min="0" max="300" value={layout.rowGap ?? 20} disabled={spacing === "global"} onChange={(event) => onChange({ ...layout, spacing: "custom", rowGap: numberValue(event.target.value) })} /><small>{spacing === "global" ? "Inherited from Site Settings." : "Pixels between rows."}</small></label>
    </div>
    <ResponsiveContainerFields layout={layout} mode={mode} onChange={onChange} />
    <details className="page-builder-advanced-section"><summary>Additional options</summary><div className="page-style-grid"><label className="field"><span>Overflow</span><select value={layout.overflow ?? "visible"} onChange={(event) => onChange({ ...layout, overflow: event.target.value as PageBlockLayout["overflow"] })}><option value="visible">Visible</option><option value="hidden">Hidden</option><option value="auto">Auto scroll</option><option value="scroll">Always scroll</option></select></label><label className="field"><span>HTML tag</span><select value={layout.htmlTag ?? "section"} onChange={(event) => onChange({ ...layout, htmlTag: event.target.value as PageBlockLayout["htmlTag"] })}>{["div", "header", "footer", "main", "article", "section", "aside", "nav", "a"].map((tag) => <option key={tag} value={tag}>{tag}</option>)}</select></label></div>{layout.htmlTag === "a" ? <div className="form-row"><label className="field"><span>Container link</span><input type="url" value={layout.linkUrl ?? ""} onChange={(event) => onChange({ ...layout, linkUrl: event.target.value })} placeholder="https://example.com" /></label><label className="field"><span>Link target</span><select value={layout.linkTarget ?? "same"} onChange={(event) => onChange({ ...layout, linkTarget: event.target.value as PageBlockLayout["linkTarget"] })}><option value="same">Same window</option><option value="new">New window</option></select></label></div> : null}<small>Semantic tags change the wrapper without changing the layout. The link tag adds a safe destination to the container.</small></details>
  </div>;
}

function ResponsiveContainerFields({ layout, mode, onChange }: { layout: PageBlockLayout; mode: PageContainerMode; onChange: (layout: PageBlockLayout) => void }) {
  const [device, setDevice] = useState<PageStyleDevice>("desktop");
  const responsive = layout.responsive?.[device] ?? {};
  const responsiveValue = <K extends keyof PageBlockLayoutResponsive>(key: K, fallback: PageBlockLayoutResponsive[K]): PageBlockLayoutResponsive[K] => (responsive[key] ?? layout[key] ?? fallback) as PageBlockLayoutResponsive[K];
  const updateResponsive = (patch: Partial<PageBlockLayoutResponsive>) => onChange({ ...layout, responsive: { ...(layout.responsive ?? {}), [device]: { ...responsive, ...patch } } });
  const resetResponsive = () => {
    const nextResponsive = { ...(layout.responsive ?? {}) };
    delete nextResponsive[device];
    onChange({ ...layout, responsive: Object.keys(nextResponsive).length > 0 ? nextResponsive : undefined });
  };
  const width = responsiveValue("width", layout.width ?? 1200);
  const minHeight = responsiveValue("minHeight", layout.minHeight ?? 480);
  const widthUnit = responsiveValue("widthUnit", layout.widthUnit ?? "px");
  const minHeightUnit = responsiveValue("minHeightUnit", layout.minHeightUnit ?? "px");
  return <details className="page-builder-advanced-section" open>
    <summary>Responsive layout overrides</summary>
    <p className="field-help">Start with the desktop layout, then override the selected device without changing other breakpoints.</p>
    <div className="page-style-device-tabs" role="tablist" aria-label="Container layout device"><span>Device</span>{PAGE_STYLE_DEVICES.map(({ key, label }) => <button type="button" key={key} className={device === key ? "is-active" : ""} onClick={() => setDevice(key)} role="tab" aria-selected={device === key}>{label}</button>)}</div>
    <div className="page-style-grid">
      <label className="field"><span>Content width</span><select value={responsiveValue("contentWidth", layout.contentWidth ?? "boxed")} onChange={(event) => updateResponsive({ contentWidth: event.target.value as PageContainerContentWidth })}><option value="boxed">Boxed</option><option value="full">Full width</option></select></label>
      <label className="field"><span>Width</span><input type="range" min="0" max="3000" value={width} onChange={(event) => updateResponsive({ width: numberValue(event.target.value) })} /><span className="page-container-measure"><input type="number" min="0" max="3000" value={width} onChange={(event) => updateResponsive({ width: numberValue(event.target.value) })} /><select aria-label={`${device} width unit`} value={widthUnit} onChange={(event) => updateResponsive({ widthUnit: event.target.value as PageContainerMeasureUnit })}>{["px", "%", "em", "rem", "vw"].map((unit) => <option key={unit} value={unit}>{unit}</option>)}</select></span></label>
      <label className="field"><span>Minimum height</span><input type="range" min="0" max="3000" value={minHeight} onChange={(event) => updateResponsive({ minHeight: numberValue(event.target.value) })} /><span className="page-container-measure"><input type="number" min="0" max="3000" value={minHeight} onChange={(event) => updateResponsive({ minHeight: numberValue(event.target.value) })} /><select aria-label={`${device} minimum height unit`} value={minHeightUnit} onChange={(event) => updateResponsive({ minHeightUnit: event.target.value as PageContainerMeasureUnit })}>{["px", "em", "rem", "vh"].map((unit) => <option key={unit} value={unit}>{unit}</option>)}</select></span></label>
    </div>
    {mode === "flex" ? <div className="page-style-grid">
      <label className="field"><span>Direction</span><select value={responsiveValue("direction", layout.direction ?? "column")} onChange={(event) => updateResponsive({ direction: event.target.value as PageContainerDirection })}><option value="row">Row</option><option value="column">Column</option><option value="row-reverse">Row reversed</option><option value="column-reverse">Column reversed</option></select></label>
      <label className="field"><span>Justify content</span><select value={responsiveValue("justifyContent", layout.justifyContent ?? "start")} onChange={(event) => updateResponsive({ justifyContent: event.target.value as PageContainerJustify })}><option value="start">Start</option><option value="center">Center</option><option value="end">End</option><option value="space-between">Space between</option><option value="space-around">Space around</option><option value="space-evenly">Space evenly</option></select></label>
      <label className="field"><span>Align items</span><select value={responsiveValue("alignItems", layout.alignItems ?? "stretch")} onChange={(event) => updateResponsive({ alignItems: event.target.value as PageContainerAlign })}><option value="start">Start</option><option value="center">Center</option><option value="end">End</option><option value="stretch">Stretch</option></select></label>
      <label className="field"><span>Wrap</span><select value={responsiveValue("wrap", layout.wrap ?? "nowrap")} onChange={(event) => updateResponsive({ wrap: event.target.value as PageContainerWrap })}><option value="nowrap">No wrap</option><option value="wrap">Wrap items</option></select></label>
    </div> : <div className="page-style-grid">
      <label className="field"><span>Columns</span><input type="number" min="1" max="6" step="1" value={responsiveValue("columns", layout.columns ?? 2)} onChange={(event) => updateResponsive({ columns: numberValue(event.target.value) })} /></label>
      <label className="field"><span>Rows</span><input type="number" min="1" max="12" step="1" value={responsiveValue("rows", layout.rows ?? 1)} onChange={(event) => updateResponsive({ rows: numberValue(event.target.value) })} /></label>
      <label className="field"><span>Auto flow</span><select value={responsiveValue("autoFlow", layout.autoFlow ?? "row")} onChange={(event) => updateResponsive({ autoFlow: event.target.value as "row" | "column" })}><option value="row">Row</option><option value="column">Column</option></select></label>
      <label className="field"><span>Justify items</span><select value={responsiveValue("justifyItems", layout.justifyItems ?? "stretch")} onChange={(event) => updateResponsive({ justifyItems: event.target.value as PageContainerAlign })}><option value="start">Start</option><option value="center">Center</option><option value="end">End</option><option value="stretch">Stretch</option></select></label>
    </div>}
    <div className="page-style-grid">
      <label className="field"><span>Column gap</span><input type="number" min="0" max="300" value={responsiveValue("columnGap", layout.columnGap ?? 20)} onChange={(event) => updateResponsive({ columnGap: numberValue(event.target.value) })} /><small>Pixels between columns.</small></label>
      <label className="field"><span>Row gap</span><input type="number" min="0" max="300" value={responsiveValue("rowGap", layout.rowGap ?? 20)} onChange={(event) => updateResponsive({ rowGap: numberValue(event.target.value) })} /><small>Pixels between rows.</small></label>
    </div>
    <button type="button" className="button button-secondary button-small" onClick={resetResponsive} disabled={!layout.responsive?.[device]}>Reset {device} overrides</button>
  </details>;
}

function RichTextFields({ block, onChange }: { block: PageBlock; onChange: (key: string, value: string | number) => void }) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const visualRef = useRef<HTMLDivElement>(null);
  const body = String(block.data.body ?? "");
  const [mode, setMode] = useState<"visual" | "code">("visual");
  const [blockFormat, setBlockFormat] = useState(String(block.data.textFormat ?? "p"));
  const [imageUrl, setImageUrl] = useState("");
  const [imageAlt, setImageAlt] = useState("");

  useEffect(() => {
    if (mode !== "visual" || !visualRef.current || document.activeElement === visualRef.current) return;
    const next = sanitizeHtml(body);
    if (visualRef.current.innerHTML !== next) visualRef.current.innerHTML = next;
  }, [body, mode]);

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

  function syncVisual() {
    if (visualRef.current) onChange("body", sanitizeHtml(visualRef.current.innerHTML));
  }

  function runVisualCommand(command: string, value?: string) {
    visualRef.current?.focus();
    document.execCommand(command, false, value);
    syncVisual();
  }

  function insertMarkup(markup: string) {
    if (mode === "visual") {
      runVisualCommand("insertHTML", sanitizeHtml(markup));
      return;
    }
    replaceSelection(markup, "");
  }

  function addImage() {
    const src = imageUrl.trim();
    if (!src) return;
    insertMarkup(`<img src="${src}" alt="${imageAlt.trim() || "Content image"}" />`);
    setImageUrl("");
    setImageAlt("");
  }

  function applyBlockFormat(value: string) {
    setBlockFormat(value);
    onChange("textFormat", value);
    if (mode === "visual") runVisualCommand("formatBlock", value);
    else replaceSelection(`<${value}>`, `</${value}>`);
  }

  return <div className="page-builder-fields">
    <div className="field"><label htmlFor={`page-${block.id}-heading`}>Heading</label><input id={`page-${block.id}-heading`} value={String(block.data.heading ?? "")} onChange={(event) => onChange("heading", event.target.value)} /></div>
    <div className="rich-text-toolbar" aria-label="Rich text formatting">
      <label className="rich-text-block-format"><span className="sr-only">Block type</span><select aria-label="Block type" value={blockFormat} onChange={(event) => applyBlockFormat(event.target.value)}><option value="p">Paragraph</option><option value="h1">Heading 1</option><option value="h2">Heading 2</option><option value="h3">Heading 3</option><option value="h4">Heading 4</option><option value="h5">Heading 5</option><option value="h6">Heading 6</option><option value="blockquote">Quote</option><option value="pre">Preformatted</option></select></label>
      <span className="rich-text-toolbar-divider" aria-hidden="true" />
      <button type="button" className="rich-text-icon-button" aria-label="Bold" title="Bold" onClick={() => mode === "visual" ? runVisualCommand("bold") : replaceSelection("<strong>", "</strong>")}><Bold size={16} /></button>
      <button type="button" className="rich-text-icon-button" aria-label="Italic" title="Italic" onClick={() => mode === "visual" ? runVisualCommand("italic") : replaceSelection("<em>", "</em>")}><Italic size={16} /></button>
      <button type="button" className="rich-text-icon-button" aria-label="Underline" title="Underline" onClick={() => mode === "visual" ? runVisualCommand("underline") : replaceSelection("<u>", "</u>")}><Underline size={16} /></button>
      <button type="button" className="rich-text-icon-button" aria-label="Strikethrough" title="Strikethrough" onClick={() => mode === "visual" ? runVisualCommand("strikeThrough") : replaceSelection("<s>", "</s>")}><Strikethrough size={16} /></button>
      <button type="button" className="rich-text-icon-button" aria-label="Bulleted list" title="Bulleted list" onClick={() => mode === "visual" ? runVisualCommand("insertUnorderedList") : replaceSelection("<ul><li>", "</li></ul>")}><List size={16} /></button>
      <button type="button" className="rich-text-icon-button" aria-label="Numbered list" title="Numbered list" onClick={() => mode === "visual" ? runVisualCommand("insertOrderedList") : replaceSelection("<ol><li>", "</li></ol>")}><ListOrdered size={16} /></button>
      <button type="button" className="rich-text-icon-button" aria-label="Quote" title="Quote" onClick={() => applyBlockFormat("blockquote")}><Quote size={16} /></button>
      <span className="rich-text-toolbar-divider" aria-hidden="true" />
      <button type="button" className="rich-text-icon-button" aria-label="Align left" title="Align left" onClick={() => { onChange("textAlign", "left"); mode === "visual" ? runVisualCommand("justifyLeft") : replaceSelection('<div style="text-align:left">', "</div>"); }}><AlignLeft size={16} /></button>
      <button type="button" className="rich-text-icon-button" aria-label="Align center" title="Align center" onClick={() => { onChange("textAlign", "center"); mode === "visual" ? runVisualCommand("justifyCenter") : replaceSelection('<div style="text-align:center">', "</div>"); }}><AlignCenter size={16} /></button>
      <button type="button" className="rich-text-icon-button" aria-label="Align right" title="Align right" onClick={() => { onChange("textAlign", "right"); mode === "visual" ? runVisualCommand("justifyRight") : replaceSelection('<div style="text-align:right">', "</div>"); }}><AlignRight size={16} /></button>
      <button type="button" className="rich-text-icon-button" aria-label="Justify" title="Justify" onClick={() => { onChange("textAlign", "justify"); mode === "visual" ? runVisualCommand("justifyFull") : replaceSelection('<div style="text-align:justify">', "</div>"); }}><AlignJustify size={16} /></button>
      <button type="button" className="rich-text-icon-button" aria-label="Clear formatting" title="Clear formatting" onClick={() => mode === "visual" ? runVisualCommand("removeFormat") : replaceSelection("", "")}><RemoveFormatting size={16} /></button>
      <button type="button" className="rich-text-icon-button" aria-label="Undo" title="Undo" onClick={() => mode === "visual" ? runVisualCommand("undo") : replaceSelection("", "")}><Undo2 size={16} /></button>
      <button type="button" className="rich-text-icon-button" aria-label="Redo" title="Redo" onClick={() => mode === "visual" ? runVisualCommand("redo") : replaceSelection("", "")}><Redo2 size={16} /></button>
      <label className="rich-text-tool"><span>Color</span><input type="color" value={String(block.data.textColor || "#52615e")} onChange={(event) => { const color = event.target.value; onChange("textColor", color); mode === "visual" ? runVisualCommand("foreColor", color) : replaceSelection(`<span style="color:${color}">`, "</span>"); }} /></label>
      <label className="rich-text-tool"><span>Size</span><select value={String(block.data.fontSize || "medium")} onChange={(event) => { const size = event.target.value; onChange("fontSize", size); const sizes: Record<string, string> = { small: "0.9rem", medium: "1rem", large: "1.2rem", xlarge: "1.5rem" }; mode === "visual" ? runVisualCommand("fontSize", size === "small" ? "2" : size === "large" ? "5" : size === "xlarge" ? "6" : "3") : replaceSelection(`<span style="font-size:${sizes[size] ?? sizes.medium}">`, "</span>"); }}><option value="small">Small</option><option value="medium">Normal</option><option value="large">Large</option><option value="xlarge">Extra large</option></select></label>
      <label className="rich-text-tool"><span>Align</span><select value={String(block.data.textAlign || "left")} onChange={(event) => { const align = event.target.value; onChange("textAlign", align); if (mode === "visual") runVisualCommand(align === "center" ? "justifyCenter" : align === "right" ? "justifyRight" : align === "justify" ? "justifyFull" : "justifyLeft"); }}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option><option value="justify">Justified</option></select></label>
    </div>
    <div className="rich-text-editor-shell">
      <div className="rich-text-editor-header">
        <span className="rich-text-editor-label">HTML content</span>
        <div className="rich-text-mode-switch" role="tablist" aria-label="Editor mode">
          <button type="button" className={`button button-small ${mode === "visual" ? "button-primary" : "button-secondary"}`} role="tab" aria-selected={mode === "visual"} onClick={() => setMode("visual")}>Visual</button>
          <button type="button" className={`button button-small ${mode === "code" ? "button-primary" : "button-secondary"}`} role="tab" aria-selected={mode === "code"} onClick={() => setMode("code")}>Code</button>
        </div>
      </div>
      {mode === "visual" ? <div ref={visualRef} id={`page-${block.id}-body-visual`} className="rich-text-editor rich-text-editor-visual" contentEditable suppressContentEditableWarning role="textbox" aria-multiline="true" onInput={syncVisual} /> : <textarea ref={textareaRef} id={`page-${block.id}-body`} value={body} onChange={(event) => onChange("body", event.target.value)} placeholder="Write plain text or safe HTML source." />}
    </div>
    {mode === "visual" ? <small>Visual mode edits the formatted content directly. Switch to Code to inspect or refine the sanitized HTML source.</small> : <small>Code mode accepts safe HTML. Formatting is sanitized on save; scripts, forms, unsafe URLs, and unapproved embeds are removed.</small>}
    <div className="rich-text-image-tools"><div className="field"><label htmlFor={`page-${block.id}-image-url`}>Insert image URL</label><input id={`page-${block.id}-image-url`} type="url" value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="https://images.example.com/photo.jpg" /></div><div className="field"><label htmlFor={`page-${block.id}-image-alt`}>Image alt text</label><input id={`page-${block.id}-image-alt`} value={imageAlt} onChange={(event) => setImageAlt(event.target.value)} placeholder="Describe the image" /></div><button type="button" className="button button-secondary button-small" onClick={addImage}>Insert image</button></div>
  </div>;
}

function RichTextLayoutFields({ block, onChange }: { block: PageBlock; onChange: (key: string, value: string | number) => void }) {
  const columns = Math.min(6, Math.max(1, Number(block.data.columns) || 1));
  return <div className="rich-text-layout-fields">
    <label className="page-style-visibility-row"><span>Drop Cap</span><button type="button" className={`page-style-switch ${String(block.data.dropCap ?? "no") === "yes" ? "is-active" : ""}`} aria-pressed={String(block.data.dropCap ?? "no") === "yes"} onClick={() => onChange("dropCap", String(block.data.dropCap ?? "no") === "yes" ? "no" : "yes")}>{String(block.data.dropCap ?? "no") === "yes" ? "Yes" : "No"}</button></label>
    <div className="rich-text-layout-divider" />
    <div className="form-row"><label className="field"><span>Columns</span><select value={String(columns)} onChange={(event) => onChange("columns", Number(event.target.value))}><option value="1">Default</option><option value="2">2 columns</option><option value="3">3 columns</option><option value="4">4 columns</option><option value="5">5 columns</option><option value="6">6 columns</option></select></label><label className="field"><span>Columns Gap</span><div className="rich-text-number-with-unit"><input type="number" min="0" max="300" value={String(block.data.columnsGap ?? 24)} onChange={(event) => onChange("columnsGap", event.target.value)} /><select aria-label="Columns gap unit" value={String(block.data.columnsGapUnit ?? "px")} onChange={(event) => onChange("columnsGapUnit", event.target.value)}><option value="px">px</option><option value="%">%</option><option value="em">em</option><option value="rem">rem</option><option value="vw">vw</option></select></div></label></div>
  </div>;
}

function BlockFields({ block, navigationMenus, forms, locations, onChange, onLayoutChange, onPreset }: { block: PageBlock; navigationMenus: NavigationMenuView[]; forms: FormDefinition[]; locations: ManagedServiceLocation[]; onChange: (key: string, value: string | number) => void; onLayoutChange: (layout: PageBlockLayout) => void; onPreset: (preset: typeof containerPresets[number]) => void }) {
  const field = (key: string, label: string, multiline = false) => <div className="field" key={key}><label htmlFor={`page-${block.id}-${key}`}>{label}</label>{multiline ? <textarea id={`page-${block.id}-${key}`} value={String(block.data[key] ?? "")} onChange={(event) => onChange(key, event.target.value)} /> : <input id={`page-${block.id}-${key}`} value={String(block.data[key] ?? "")} onChange={(event) => onChange(key, event.target.value)} />}</div>;
  const mediaField = (key: string, label: string, pickerLabel = "Choose from Media Library") => <div className="field media-field" key={key}><label htmlFor={`page-${block.id}-${key}`}>{label}</label><div className="media-field-controls"><input id={`page-${block.id}-${key}`} type="url" value={String(block.data[key] ?? "")} onChange={(event) => onChange(key, event.target.value)} /><MediaPicker value={String(block.data[key] ?? "")} onChange={(value) => onChange(key, value)} label={pickerLabel} /></div></div>;
  if (block.type === "container") return <ContainerFields block={block} onChange={onLayoutChange} onPreset={onPreset} />;
  if (block.type === "hero") return <div className="page-builder-fields">{field("eyebrow", "Eyebrow")}{field("heading", "Heading")}{field("body", "Body copy", true)}<div className="form-row">{field("ctaLabel", "Button label")}{field("ctaHref", "Button link")}</div></div>;
  if (block.type === "heading") return <div className="page-builder-fields">{field("text", "Heading text")}<div className="form-row"><label className="field"><span>HTML tag</span><select value={String(block.data.tag ?? "h2")} onChange={(event) => onChange("tag", event.target.value)}>{["h1", "h2", "h3", "h4", "h5", "h6", "div", "span", "p"].map((tag) => <option key={tag} value={tag}>{tag.toUpperCase()}</option>)}</select></label><label className="field"><span>Alignment</span><select value={String(block.data.alignment ?? "left")} onChange={(event) => onChange("alignment", event.target.value)}><option value="left">Start</option><option value="center">Center</option><option value="right">End</option><option value="justify">Justified</option></select></label></div><div className="form-row">{field("link", "Link URL")}<label className="field"><span>Link target</span><select value={String(block.data.linkTarget ?? "same")} onChange={(event) => onChange("linkTarget", event.target.value)}><option value="same">Same window</option><option value="new">New window</option></select></label></div><label className="form-choice"><input type="checkbox" checked={String(block.data.linkNofollow ?? "no") === "yes"} onChange={(event) => onChange("linkNofollow", event.target.checked ? "yes" : "no")} /><span>Add nofollow to the heading link</span></label>{field("linkAttributes", "Custom link attributes", true)}<small>One per line using <code>aria-label|Read more</code> or <code>data-track=heading</code>. Unsafe event, style, href, target, and rel attributes are ignored.</small></div>;
  if (block.type === "rich_text") return <><RichTextFields block={block} onChange={onChange} /><RichTextLayoutFields block={block} onChange={onChange} /></>;
  if (block.type === "image") return <div className="page-builder-fields">{mediaField("src", "Image URL", "Choose image")}{field("alt", "Alt text")}{field("caption", "Caption")}<div className="form-row"><label className="field"><span>Image resolution</span><select value={String(block.data.imageResolution ?? "full")} onChange={(event) => onChange("imageResolution", event.target.value)}><option value="thumbnail">Thumbnail</option><option value="medium">Medium</option><option value="large">Large</option><option value="full">Full</option><option value="custom">Custom</option></select></label><label className="field"><span>Image link</span><select value={String(block.data.imageLinkMode ?? "none")} onChange={(event) => onChange("imageLinkMode", event.target.value)}><option value="none">None</option><option value="media">Media file</option><option value="custom">Custom URL</option></select></label></div>{String(block.data.imageLinkMode ?? "none") === "custom" ? field("imageLink", "Custom image link") : null}<small>Choose a reusable asset or enter a direct HTTPS image URL. Resolution is retained as media metadata.</small></div>;
  if (block.type === "image_box") return <div className="page-builder-fields">{mediaField("src", "Image URL", "Choose image")}<div className="form-row"><label className="field"><span>Image resolution</span><select value={String(block.data.imageResolution ?? "full")} onChange={(event) => onChange("imageResolution", event.target.value)}><option value="thumbnail">Thumbnail</option><option value="medium">Medium</option><option value="large">Large</option><option value="full">Full</option><option value="custom">Custom</option></select></label>{field("imageLink", "Link")}</div>{field("title", "Title")}{field("description", "Description", true)}<label className="field"><span>Title HTML tag</span><select value={String(block.data.titleTag ?? "h3")} onChange={(event) => onChange("titleTag", event.target.value)}>{["h1", "h2", "h3", "h4", "h5", "h6", "div", "span", "p"].map((tag) => <option key={tag} value={tag}>{tag.toUpperCase()}</option>)}</select></label><small>The shared Style and Advanced controls below apply to the whole Image Box.</small></div>;
  if (block.type === "icon") return <div className="page-builder-fields"><div className="form-row"><label className="field"><span>Icon source</span><select value={String(block.data.iconSource ?? "fontawesome-solid")} onChange={(event) => onChange("iconSource", event.target.value)}>{iconSources.map((source) => <option key={source.value} value={source.value}>{source.label}</option>)}</select></label><label className="field"><span>View</span><select value={String(block.data.iconView ?? "default")} onChange={(event) => onChange("iconView", event.target.value)}><option value="default">Default</option><option value="stacked">Stacked</option><option value="framed">Framed</option></select></label></div><label className="field"><span>Icon library</span><select value={String(block.data.iconName ?? "sparkles")} onChange={(event) => onChange("iconName", event.target.value)}>{iconNames.map((icon) => <option key={icon.value} value={icon.value}>{icon.label}</option>)}</select></label><div className="form-row"><div>{field("iconUrl", "Custom SVG or icon asset URL")}</div><div className="field"><span>Reusable icon asset</span><MediaPicker value={String(block.data.iconUrl ?? "")} onChange={(value) => onChange("iconUrl", value)} label="Choose image or SVG" /></div></div><div className="form-row">{field("link", "Link URL")}<label className="field"><span>Link target</span><select value={String(block.data.linkTarget ?? "same")} onChange={(event) => onChange("linkTarget", event.target.value)}><option value="same">Same window</option><option value="new">New window</option></select></label></div><label className="form-choice"><input type="checkbox" checked={String(block.data.linkNofollow ?? "no") === "yes"} onChange={(event) => onChange("linkNofollow", event.target.checked ? "yes" : "no")} /><span>Add nofollow</span></label><small>Use Font Awesome Regular, Solid, or Brands icons, or choose an SVG from the Media Library. Style controls below set alignment, color, size, and rotation.</small></div>;
  if (block.type === "icon_box") return <div className="page-builder-fields"><div className="form-row"><label className="field"><span>Icon source</span><select value={String(block.data.iconSource ?? "fontawesome-solid")} onChange={(event) => onChange("iconSource", event.target.value)}>{iconSources.map((source) => <option key={source.value} value={source.value}>{source.label}</option>)}</select></label><label className="field"><span>View</span><select value={String(block.data.iconView ?? "framed")} onChange={(event) => onChange("iconView", event.target.value)}><option value="default">Default</option><option value="stacked">Stacked</option><option value="framed">Framed</option></select></label></div><label className="field"><span>Icon library</span><select value={String(block.data.iconName ?? "shield")} onChange={(event) => onChange("iconName", event.target.value)}>{iconNames.map((icon) => <option key={icon.value} value={icon.value}>{icon.label}</option>)}</select></label><div className="form-row"><div>{field("iconUrl", "Custom SVG or icon asset URL")}</div><div className="field"><span>Reusable icon asset</span><MediaPicker value={String(block.data.iconUrl ?? "")} onChange={(value) => onChange("iconUrl", value)} label="Choose image or SVG" /></div></div>{field("title", "Title")}{field("description", "Description", true)}{field("link", "Link")}<label className="field"><span>Title HTML tag</span><select value={String(block.data.titleTag ?? "h3")} onChange={(event) => onChange("titleTag", event.target.value)}>{["h1", "h2", "h3", "h4", "h5", "h6", "div", "span", "p"].map((tag) => <option key={tag} value={tag}>{tag.toUpperCase()}</option>)}</select></label><small>Font Awesome source groups use the shared Regular, Solid, and Brands catalog. Upload or choose an SVG from the Media Library for a custom icon; raw SVG markup is never rendered.</small></div>;
  if (block.type === "video") return <div className="page-builder-fields"><label className="field"><span>Video source</span><select value={String(block.data.source ?? "youtube")} onChange={(event) => onChange("source", event.target.value)}><option value="youtube">YouTube</option><option value="vimeo">Vimeo</option><option value="file">Hosted video file</option></select></label>{field("url", "Video URL")}<div className="form-row">{field("start", "Start time (seconds)")}{field("end", "End time (seconds)")}</div><div className="form-row">{(["autoplay", "mute", "loop", "controls"] as const).map((key) => <label className="field" key={key}><span>{key[0].toUpperCase() + key.slice(1)}</span><select value={String(block.data[key] ?? (key === "controls" ? "yes" : "no"))} onChange={(event) => onChange(key, event.target.value)}><option value="no">No</option><option value="yes">Yes</option></select></label>)}</div><div className="form-row"><label className="field"><span>Captions</span><select value={String(block.data.captions ?? "no")} onChange={(event) => onChange("captions", event.target.value)}><option value="no">Off</option><option value="yes">On</option></select></label>{String(block.data.captions ?? "no") === "yes" ? field("captionsUrl", "Caption track URL") : null}</div><div className="form-row"><label className="field"><span>Suggested videos</span><select value={String(block.data.suggestedVideos ?? "no")} onChange={(event) => onChange("suggestedVideos", event.target.value)}><option value="no">Off</option><option value="yes">On</option></select></label><label className="field"><span>Privacy mode</span><select value={String(block.data.privacy ?? "yes")} onChange={(event) => onChange("privacy", event.target.value)}><option value="yes">Privacy enhanced</option><option value="no">Standard</option></select></label></div><details className="page-builder-advanced-section" open><summary>Image overlay</summary><div className="form-row"><label className="field"><span>Overlay</span><select value={String(block.data.overlay ?? "hide")} onChange={(event) => onChange("overlay", event.target.value)}><option value="hide">Hide</option><option value="show">Show before playback</option></select></label><label className="field"><span>Play icon</span><select value={String(block.data.overlayPlayIcon ?? "yes")} onChange={(event) => onChange("overlayPlayIcon", event.target.value)}><option value="yes">Show</option><option value="no">Hide</option></select></label></div><div className="form-row"><label className="field"><span>Lightbox</span><select value={String(block.data.overlayLightbox ?? "no")} onChange={(event) => onChange("overlayLightbox", event.target.value)}><option value="no">Off</option><option value="yes">On</option></select></label>{mediaField("overlayImage", "Overlay / fallback image URL", "Choose fallback image")}</div><label className="field"><span>Overlay image alt text</span><input value={String(block.data.overlayAlt ?? "Video preview")} onChange={(event) => onChange("overlayAlt", event.target.value)} /></label></details><small>Only recognized YouTube, Vimeo, and HTTPS video URLs are rendered. Captions can use YouTube captions or an HTTPS WebVTT track, and suggested videos controls related-video behavior. The overlay can hold playback until the visitor activates the video, with an optional lightbox.</small></div>;
  if (block.type === "map") {
    const locationMode = String(block.data.locationMode ?? "address") === "coordinates" ? "coordinates" : "address";
    return <div className="page-builder-fields"><label className="field"><span>Location input</span><select value={locationMode} onChange={(event) => onChange("locationMode", event.target.value)}><option value="address">Street address or place</option><option value="coordinates">Latitude and longitude</option></select></label>{locationMode === "coordinates" ? <div className="form-row"><label className="field"><span>Latitude</span><input type="number" min="-90" max="90" step="any" value={String(block.data.latitude ?? "")} onChange={(event) => onChange("latitude", event.target.value)} placeholder="32.7357" /></label><label className="field"><span>Longitude</span><input type="number" min="-180" max="180" step="any" value={String(block.data.longitude ?? "")} onChange={(event) => onChange("longitude", event.target.value)} placeholder="-97.1081" /></label></div> : <label className="field"><span>Street address or place</span><input value={String(block.data.address ?? block.data.location ?? "")} onChange={(event) => onChange("address", event.target.value)} placeholder="123 Main Street, Arlington, TX 76014" /></label>}<div className="form-row">{field("zoom", "Zoom")}{field("height", "Height (pixels)")}</div><label className="field"><span>Google place card</span><select value={String(block.data.showPlaceCard ?? "no")} onChange={(event) => onChange("showPlaceCard", event.target.value)}><option value="no">Off</option><option value="yes">On — requires Google Places API key</option></select></label>{String(block.data.showPlaceCard ?? "no") === "yes" ? field("placeQuery", "Places search override") : null}<small>Use a full street address with ZIP code, a place name, or switch to coordinates and enter latitude from -90 to 90 and longitude from -180 to 180. The published map uses a safe Google Maps embed URL and opens the full map in a separate tab. The optional card uses the server-side GOOGLE_PLACES_API_KEY and never exposes that key to the browser.</small></div>;
  }
  if (block.type === "location_index") return <div className="page-builder-fields">{field("heading", "Section heading")}<small>This block keeps the synthetic service-area directory connected to the page while the surrounding hero, copy, CTA, and block styling remain editable.</small></div>;
  if (block.type === "location_detail") return <div className="page-builder-fields"><div className="field"><label htmlFor={`page-${block.id}-locationSlug`}>Managed service location</label><select id={`page-${block.id}-locationSlug`} value={String(block.data.locationSlug ?? "")} onChange={(event) => onChange("locationSlug", event.target.value)}><option value="">Choose a service location</option>{locations.map((location) => <option key={location.id} value={location.slug}>{location.city}, {location.region} · {location.pageStatus}</option>)}</select></div><small>This reusable template renders the selected location’s details, formats, FAQs, and related coverage links. Manage the location record separately; use this block to control where the template appears.</small></div>;
  if (block.type === "button") return <div className="page-builder-fields">{field("buttonLabel", "Button text")}{field("buttonHref", "Button link")}<div className="form-row"><label className="field"><span>Button type</span><select value={String(block.data.buttonType ?? "default")} onChange={(event) => onChange("buttonType", event.target.value)}><option value="default">Default</option><option value="info">Info</option><option value="success">Success</option><option value="warning">Warning</option><option value="danger">Danger</option></select></label>{field("buttonId", "Button ID")}</div><div className="form-row">{field("buttonIcon", "Optional icon")}<label className="field"><span>Icon position</span><select value={String(block.data.buttonIconPosition ?? "left")} onChange={(event) => onChange("buttonIconPosition", event.target.value)}><option value="left">Left</option><option value="right">Right</option></select></label></div><small>Use a short text symbol or emoji for the optional icon. Button links are limited to safe internal or HTTPS destinations when published.</small></div>;
  if (block.type === "cta") return <div className="page-builder-fields"><div className="form-row"><label className="field"><span>Graphic element</span><select value={String(block.data.graphicType ?? "none")} onChange={(event) => onChange("graphicType", event.target.value)}><option value="none">None</option><option value="image">Image</option><option value="icon">Icon</option></select></label>{String(block.data.graphicType ?? "none") === "icon" ? <label className="field"><span>Icon</span><select value={String(block.data.graphicIcon ?? "sparkles")} onChange={(event) => onChange("graphicIcon", event.target.value)}>{iconNames.map((icon) => <option key={icon.value} value={icon.value}>{icon.label}</option>)}</select></label> : null}</div>{String(block.data.graphicType ?? "none") === "image" ? <div className="form-row"><div>{field("graphicImage", "Graphic image URL")}</div><div className="field"><span>Choose image</span><MediaPicker value={String(block.data.graphicImage ?? "")} onChange={(value) => onChange("graphicImage", value)} label="Choose image" /></div></div> : null}<div className="form-row">{field("heading", "Heading")}<label className="field"><span>Heading tag</span><select value={String(block.data.titleTag ?? "h2")} onChange={(event) => onChange("titleTag", event.target.value)}>{["h1", "h2", "h3", "h4", "h5", "h6", "div", "span", "p"].map((tag) => <option key={tag} value={tag}>{tag.toUpperCase()}</option>)}</select></label></div><div className="form-row">{field("body", "Body copy", true)}<label className="field"><span>Description tag</span><select value={String(block.data.descriptionTag ?? "p")} onChange={(event) => onChange("descriptionTag", event.target.value)}>{["p", "div", "span"].map((tag) => <option key={tag} value={tag}>{tag.toUpperCase()}</option>)}</select></label></div><div className="form-row">{field("buttonLabel", "Button label")}{field("buttonHref", "Button link")}</div><div className="form-row"><label className="field"><span>Button target</span><select value={String(block.data.buttonTarget ?? "same")} onChange={(event) => onChange("buttonTarget", event.target.value)}><option value="same">Same window</option><option value="new">New window</option></select></label><label className="form-choice"><input type="checkbox" checked={String(block.data.buttonNofollow ?? "no") === "yes"} onChange={(event) => onChange("buttonNofollow", event.target.checked ? "yes" : "no")} /><span>Add nofollow</span></label></div>{field("ribbonText", "Ribbon text")}<small>CTA content starts with editable placeholder copy and supports an optional image, Font Awesome icon, semantic tags, link options, and ribbon text.</small></div>;
  if (block.type === "product_grid" || block.type === "product_category" || block.type === "sale_grid") return <div className="page-builder-fields">{field("heading", "Heading")}{block.type !== "sale_grid" ? field("category", block.type === "product_category" ? "Category name" : "Optional category filter") : null}<div className="form-row">{field("columns", "Columns")}{field("itemsPerPage", "Products per page")}</div><div className="form-row"><label className="field"><span>Pagination</span><select value={String(block.data.pagination ?? "numbers")} onChange={(event) => onChange("pagination", event.target.value)}><option value="numbers">Previous and next</option><option value="none">No pagination</option></select></label><label className="field"><span>Sort products</span><select value={String(block.data.sort ?? "name-asc")} onChange={(event) => onChange("sort", event.target.value)}><option value="name-asc">Name, A to Z</option><option value="name-desc">Name, Z to A</option><option value="price-asc">Price, low to high</option><option value="price-desc">Price, high to low</option></select></label></div><details className="page-builder-advanced-section" open><summary>Card content</summary><div className="page-style-grid">{(["showImage", "showSku", "showDescription", "showPrice", "showInventory", "showButton"] as const).map((key) => <label className="form-choice" key={key}><input type="checkbox" checked={String(block.data[key] ?? "yes") !== "no"} onChange={(event) => onChange(key, event.target.checked ? "yes" : "no")} /><span>{key === "showImage" ? "Image" : key === "showSku" ? "Category and SKU" : key === "showDescription" ? "Description" : key === "showPrice" ? "Price" : key === "showInventory" ? "Availability" : "View product button"}</span></label>)}</div><div className="form-row">{field("buttonLabel", "Button label")}<label className="field"><span>Card style</span><select value={String(block.data.cardStyle ?? "card")} onChange={(event) => onChange("cardStyle", event.target.value)}><option value="card">Card</option><option value="minimal">Minimal</option></select></label></div></details><small>Columns are responsive in the published grid. Pagination uses the public Products route and keeps the selected category in the URL.</small></div>;
  if (block.type === "gallery") return <div className="page-builder-fields">{field("heading", "Heading")}{field("images", "Images", true)}<small>One image per line. Use the format: image URL | alt text | caption</small></div>;
  if (block.type === "testimonial_grid") return <div className="page-builder-fields">{field("heading", "Heading")}{field("maxItems", "Maximum testimonials")}</div>;
  if (block.type === "navigation_menu") return <div className="page-builder-fields">{field("heading", "Heading")}<div className="field"><label htmlFor={`page-${block.id}-menuId`}>Menu</label><select id={`page-${block.id}-menuId`} value={String(block.data.menuId ?? "")} onChange={(event) => onChange("menuId", event.target.value)}><option value="">Choose a saved menu</option>{navigationMenus.map((menu) => <option key={menu.id} value={menu.id}>{menu.name} · {menu.locations.join(", ")}</option>)}</select></div><div className="field"><label htmlFor={`page-${block.id}-layout`}>Layout</label><select id={`page-${block.id}-layout`} value={String(block.data.layout ?? "horizontal")} onChange={(event) => onChange("layout", event.target.value)}><option value="horizontal">Horizontal links</option><option value="stacked">Stacked links</option></select></div><small>The page uses the menu’s current labels, order, and nested items when it renders.</small></div>;
  if (block.type === "form") return <div className="page-builder-fields">{field("heading", "Heading")}<div className="field"><label htmlFor={`page-${block.id}-formSlug`}>Published form</label><select id={`page-${block.id}-formSlug`} value={String(block.data.formSlug ?? "")} onChange={(event) => onChange("formSlug", event.target.value)}><option value="">Choose a published form</option>{forms.map((form) => <option key={form.id} value={form.slug}>{form.name} · /forms/{form.slug}</option>)}</select></div><small>The page loads the form definition server-side and keeps submission validation on the form API.</small></div>;
  if (block.type === "html") return <div className="page-builder-fields">{field("html", "HTML markup", true)}<small>Safe tags, links, images, and approved YouTube or Vimeo frames are retained. Scripts, forms, and unsafe embeds are removed when the page is saved.</small></div>;
  return <div className="page-builder-fields">{field("height", "Height (pixels)")}</div>;
}

function PageBlockAdvancedFields({ block, onChange, onStyleChange }: { block: PageBlock; onChange: (key: string, value: string | number) => void; onStyleChange: (style: PageBlockStyle | undefined) => void }) {
  const style = block.style ?? {};
  const visibility = String(block.data.visibility ?? "all");
  const hiddenDevices = new Set(String(block.data.hiddenDevices ?? "").split(",").map((value) => value.trim()).filter(Boolean));
  function toggleResponsiveDevice(device: string, checked: boolean) {
    const next = new Set(hiddenDevices);
    if (checked) next.add(device); else next.delete(device);
    onChange("hiddenDevices", Array.from(next).join(","));
  }
  return <div className="page-builder-fields page-builder-advanced-fields">
    <div className="page-container-heading"><div><strong>Advanced settings</strong><small>Optional anchors and responsive visibility for this block.</small></div><span className="page-container-badge">Optional</span></div>
    <PageBlockAdvancedStyleFields style={style} onChange={onStyleChange} hiddenDevices={hiddenDevices} onToggleResponsive={toggleResponsiveDevice} layoutFooter={<><div className="page-style-grid"><label className="field"><span>CSS ID</span><input id={`page-${block.id}-cssId`} value={String(block.data.cssId ?? "")} onChange={(event) => onChange("cssId", event.target.value)} placeholder="section-name" /></label><label className="field"><span>Hide on</span><select id={`page-${block.id}-visibility`} value={visibility} onChange={(event) => onChange("visibility", event.target.value)}><option value="all">All devices</option><option value="desktop">Desktop</option><option value="tablet">Tablet</option><option value="mobile">Mobile</option></select></label></div><small className="page-style-advanced-help page-builder-advanced-anchor-help">Use a CSS ID for an in-page anchor. The legacy Hide on field remains available for existing pages; Responsive visibility adds the full device matrix.</small></>} />
    <details className="page-builder-advanced-section"><summary>Attributes</summary><div className="page-style-grid"><label className="field"><span>ARIA label</span><input value={String(block.data.ariaLabel ?? "")} onChange={(event) => onChange("ariaLabel", event.target.value)} placeholder="Describe this section" /></label><label className="field"><span>Role</span><select value={String(block.data.role ?? "")} onChange={(event) => onChange("role", event.target.value)}><option value="">No role</option><option value="region">Region</option><option value="article">Article</option><option value="section">Section</option><option value="navigation">Navigation</option><option value="complementary">Complementary</option><option value="main">Main</option></select></label></div><label className="field"><span>Title attribute</span><input value={String(block.data.titleAttribute ?? "")} onChange={(event) => onChange("titleAttribute", event.target.value)} placeholder="Optional hover description" /></label></details>
    <details className="page-builder-advanced-section"><summary>Custom CSS</summary><label className="field"><span>Scoped CSS</span><textarea value={String(block.data.customCss ?? "")} onChange={(event) => onChange("customCss", event.target.value)} placeholder="color: #183b36;\nbackground: #f3faf7;" /></label><small>Simple selectors are scoped to this block in the live preview and published page. Unsafe imports and script-like expressions are removed.</small></details>
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

export function PageBuilder({ page, template, headerTemplate, footerTemplate, navigationMenus = [], forms = [], locations = [] }: { page?: ContentPage; template?: SiteTemplate; headerTemplate?: SiteTemplate | null; footerTemplate?: SiteTemplate | null; navigationMenus?: NavigationMenuView[]; forms?: FormDefinition[]; locations?: ManagedServiceLocation[] }) {
  const router = useRouter();
  const previewCanvasRef = useRef<HTMLDivElement>(null);
  const selectedInspectorRef = useRef<HTMLElement>(null);
  const isTemplate = Boolean(template);
  const [title, setTitle] = useState(() => page?.title ?? template?.name ?? "");
  const [slug, setSlug] = useState(() => page?.slug ?? "");
  const [excerpt, setExcerpt] = useState(() => page?.excerpt ?? "");
  const [status, setStatus] = useState<PageStatus>(() => page?.status ?? template?.status ?? "draft");
  const [isHomepage, setIsHomepage] = useState(() => page?.isHomepage ?? false);
  const [isActive, setIsActive] = useState(() => template?.isActive ?? false);
  const [seoTitle, setSeoTitle] = useState(() => page?.seoTitle ?? "");
  const [seoDescription, setSeoDescription] = useState(() => page?.seoDescription ?? "");
  const [blocks, setBlocks] = useState<PageBlock[]>(() => page?.blocks ?? template?.blocks ?? []);
  const [dragPath, setDragPath] = useState<BlockPath | null>(null);
  const [paletteDragKey, setPaletteDragKey] = useState<string | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [selectedPanel, setSelectedPanel] = useState<"content" | "style" | "advanced">("content");
  const [pageSettingsOpen, setPageSettingsOpen] = useState(false);
  const [selectionBox, setSelectionBox] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const [contextMenu, setContextMenu] = useState<{ blockId: string; top: number; left: number } | null>(null);
  const [preview, setPreview] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [focusedContainerId, setFocusedContainerId] = useState<string | null>(null);

  const selectedPath = selectedBlockId ? findBlockPath(blocks, selectedBlockId) : null;
  const selectedBlock = selectedPath ? getBlockAtPath(blocks, selectedPath) : undefined;

  useEffect(() => {
    const inspector = selectedInspectorRef.current;
    if (!inspector || !selectedBlock) return;
    const accordionName = selectedPanel === "style" ? "page-style-accordion" : selectedPanel === "advanced" ? "page-advanced-accordion" : "page-content-accordion";
    const selector = selectedPanel === "style" ? "details.page-style-group" : selectedPanel === "advanced" ? "details.page-style-group, details.page-builder-advanced-section" : "details.page-builder-advanced-section";
    inspector.querySelectorAll<HTMLDetailsElement>(selector).forEach((detail) => detail.setAttribute("name", accordionName));
  }, [selectedBlock, selectedPanel]);

  function keepAccordionOpen(event: React.SyntheticEvent<HTMLElement>) {
    const inspector = selectedInspectorRef.current;
    const detail = event.target;
    if (!inspector || !(detail instanceof HTMLDetailsElement) || detail.open) return;
    const groupName = detail.getAttribute("name");
    if (!groupName) return;
    const anotherOpen = Array.from(inspector.querySelectorAll<HTMLDetailsElement>("details[open]"))
      .some((candidate) => candidate !== detail && candidate.getAttribute("name") === groupName);
    if (anotherOpen) return;
    requestAnimationFrame(() => {
      if (detail.isConnected && selectedInspectorRef.current === inspector) detail.open = true;
    });
  }

  function rememberContainerForPath(path: BlockPath | null) {
    if (!path) return;
    const block = getBlockAtPath(blocks, path);
    const containerPath = block?.type === "container" ? path : nearestContainerPath(path);
    const container = containerPath ? getBlockAtPath(blocks, containerPath) : undefined;
    if (container?.type === "container") setFocusedContainerId(container.id);
  }

  function selectBlock(blockId: string | null) {
    setSelectedBlockId(blockId);
    if (blockId) rememberContainerForPath(findBlockPath(blocks, blockId));
    setSelectedPanel("content");
    setPageSettingsOpen(false);
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
    const selectedContainerPath = item.category === "basic" ? nearestContainerPath(selectedPath) : null;
    const focusedContainerPath = item.category === "basic" && focusedContainerId ? findBlockPath(blocks, focusedContainerId) : null;
    const parentPath = selectedContainerPath ?? focusedContainerPath;
    const autoContainer = item.category === "basic" ? makeAutoContainer(block) : null;
    setBlocks((current) => {
      const parent = parentPath ? getBlockAtPath(current, parentPath) : undefined;
      if (item.category === "basic" && parent?.type === "container") {
        return updateBlockAtPath(current, parentPath as BlockPath, (currentParent) => ({ ...currentParent, children: [...(currentParent.children ?? []), block] }));
      }
      return item.category === "basic" && autoContainer ? [...current, autoContainer] : [...current, block];
    });
    if (item.type === "container") setFocusedContainerId(block.id);
    else if (item.category === "basic") setFocusedContainerId(parentPath ? getBlockAtPath(blocks, parentPath)?.id ?? autoContainer?.id ?? null : autoContainer?.id ?? null);
    selectBlock(block.id);
    setMessage("");
  }

  function addChild(path: BlockPath, item: BlockLibraryItem) {
    const block = newBlockFromLibrary(item);
    setBlocks((current) => updateBlockAtPath(current, path, (parent) => parent.type === "container" ? { ...parent, children: [...(parent.children ?? []), block] } : parent));
    setFocusedContainerId(getBlockAtPath(blocks, path)?.id ?? null);
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
    const target = event.target;
    const templateShell = target instanceof Element ? target.closest<HTMLElement>("[data-page-editor-template-href]") : null;
    const clickedInteractive = target instanceof Element ? target.closest("a,button") : null;
    if (templateShell?.dataset.pageEditorTemplateHref && !clickedInteractive) {
      event.preventDefault();
      event.stopPropagation();
      router.push(templateShell.dataset.pageEditorTemplateHref);
      return;
    }
    const focusButton = target instanceof Element ? target.closest<HTMLElement>("[data-page-editor-focus-container]") : null;
    if (focusButton?.dataset.pageEditorFocusContainer) {
      event.preventDefault();
      event.stopPropagation();
      setFocusedContainerId(focusButton.dataset.pageEditorFocusContainer);
      selectBlock(null);
      setMessage("Container focused. Choose a widget to add it here.");
      return;
    }
    const frame = previewFrameFromEvent(event);
    const path = previewTargetPath(frame);
    if (!path || !frame?.dataset.pageBlockId) return;
    event.preventDefault();
    event.stopPropagation();
    rememberContainerForPath(path);
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
      const autoContainer = item.category === "basic" ? makeAutoContainer(block) : null;
      const destinationContainer = containerPath ? getBlockAtPath(blocks, containerPath) : undefined;
      if (destinationContainer?.type === "container") setFocusedContainerId(destinationContainer.id);
      else if (autoContainer) setFocusedContainerId(autoContainer.id);
      setBlocks((current) => {
        if (containerPath && getBlockAtPath(current, containerPath)?.type === "container") {
          return updateBlockAtPath(current, containerPath, (parent) => ({ ...parent, children: [...(parent.children ?? []), block] }));
        }
        if (item.category === "basic") {
          return targetPath?.length === 1 && autoContainer ? insertAfterPath(current, targetPath, autoContainer) : autoContainer ? [...current, autoContainer] : current;
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
      const endpoint = template ? `/api/admin/templates/${encodeURIComponent(template.id)}` : page ? `/api/admin/pages/${encodeURIComponent(page.id)}` : "/api/admin/pages";
      const payload = template ? { kind: template.kind, name: title, status, isActive: status === "published" && isActive, blocks } : { title, slug: slug || slugify(title), excerpt, status, isHomepage, blocks, seoTitle, seoDescription };
      const response = await fetch(endpoint, { method: page || template ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json() as { page?: { id: string; slug: string }; template?: { id: string }; error?: string };
      if (!response.ok || (!data.page && !data.template)) throw new Error(data.error ?? `The ${isTemplate ? "template" : "page"} could not be saved.`);
      if (!page && !template && data.page) router.push(`/admin/pages/${data.page.id}/edit`);
      else setMessage(`${isTemplate ? "Template" : "Page"} saved.`);
    } catch (failure) { setError(failure instanceof Error ? failure.message : `The ${isTemplate ? "template" : "page"} could not be saved.`); } finally { setSaving(false); }
  }

  const pageSettingsPanel = !template ? <>
    {isHomepage ? <div className="page-home-badge-top" role="status"><span className="page-home-badge">Current homepage</span></div> : null}
    <details className="panel page-builder-collapsible-panel" open={pageSettingsOpen} onToggle={(event) => setPageSettingsOpen(event.currentTarget.open)}>
      <summary className="page-builder-collapsible-summary"><span><span className="eyebrow">Page settings</span><strong>Page setup</strong></span></summary>
      <div className="page-builder-settings page-builder-page-settings">
        <div className="field"><label htmlFor="page-title">Page title</label><input id="page-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="About our studio" required /></div>
        <div className="field"><label htmlFor="page-slug">URL slug</label><input id="page-slug" value={slug} onChange={(event) => setSlug(slugify(event.target.value))} placeholder="about-our-studio" required={Boolean(page)} /><small>Public URL: {publicPath(slug || slugify(title), isHomepage)}</small></div>
        <div className="field"><label htmlFor="page-status">Publishing state</label><select id="page-status" value={status} onChange={(event) => { const next = event.target.value as PageStatus; setStatus(next); if (next !== "published") setIsHomepage(false); }}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></div>
        <div className="field"><label htmlFor="page-excerpt">Excerpt</label><input id="page-excerpt" value={excerpt} onChange={(event) => setExcerpt(event.target.value)} placeholder="A short summary for listings and previews." /></div>
        <section className="page-builder-nested-settings page-builder-static-settings" aria-labelledby="page-seo-heading">
          <div className="page-builder-nested-summary page-builder-static-summary"><span><span className="eyebrow">Search appearance</span><strong id="page-seo-heading">SEO fields</strong></span></div>
          <div className="form-grid"><div className="field"><label htmlFor="page-seo-title">SEO title</label><input id="page-seo-title" value={seoTitle} onChange={(event) => setSeoTitle(event.target.value)} placeholder={title || "Page title"} /></div><div className="field"><label htmlFor="page-seo-description">SEO description</label><textarea id="page-seo-description" value={seoDescription} onChange={(event) => setSeoDescription(event.target.value)} placeholder={excerpt || "Search description"} /></div></div>
        </section>
      </div>
    </details>
  </> : null;

  const selectedEditLabel = selectedBlock?.type === "container" ? "Edit container" : selectedBlock ? `Edit ${blockLabel(selectedBlock).toLowerCase()}` : "Edit element";

  return (
    <div className="page-builder">
      <div className="page-builder-toolbar">
        <div>
          <span className="eyebrow">{isTemplate ? "Visual template editor" : "Visual page editor"}</span>
          <h1 className="page-title">{page ? "Edit page" : template ? `Edit ${template.kind} template` : "Create a page"}</h1>
          <p className="page-subtitle">{isTemplate ? "Compose a reusable site shell with the same containers, widgets, styles, and live canvas used for public pages." : "Compose reusable blocks, choose Flexbox or Grid structures, drag nested blocks into place, then publish when the page is ready."}</p>
        </div>
        <div className="detail-actions">
          <Link href={isTemplate ? "/admin/appearance/templates" : "/admin/pages"} className="button button-secondary"><ArrowLeft size={14} /> {isTemplate ? "Templates" : "Pages"}</Link>
          <button type="button" className={preview ? "button button-secondary button-active" : "button button-secondary"} onClick={() => setPreview((current) => !current)} aria-pressed={preview}>{preview ? "Hide preview" : "Show preview"}</button>
          <button className="button" type="button" onClick={() => void save()} disabled={saving}><Save size={14} />{saving ? "Saving…" : `Save ${isTemplate ? "template" : "page"}`}</button>
        </div>
      </div>
      <div className="page-builder-layout">
        <aside className="page-builder-sidebar" aria-label="Page tools and settings">
          <div className="page-builder-page-name" aria-label={isTemplate ? "Current template" : "Current page"}><h2>{title || (isTemplate ? "Untitled template" : "Untitled page")}</h2><span>{isTemplate ? `${template?.kind} template` : slug ? `/${slug}` : "No slug yet"}</span></div>
          {pageSettingsPanel}
          {!selectedBlock ? <section className="panel page-block-library">
            <div className="panel-header">
              <div className="page-builder-library-heading"><span className="eyebrow">Elements</span><h2 className="panel-title">Add content</h2></div>
              <p className="page-builder-library-help">Start with a container, or drop a widget below a section to create a full-width container automatically.</p>
            </div>
            <div className="page-builder-panel-tabs" aria-label="Element categories"><span className="is-active">Widgets</span></div>
            {(["layout", "basic"] as const).map((category) => <div className="page-builder-library-group" key={category}><div className="page-builder-library-group-heading"><span>{category === "layout" ? "Layout" : "Basic"}</span><small>{category === "layout" ? "Start with a container" : "Drop inside, or create one below"}</small></div>{blockLibrary.filter((item) => item.category === category).map((item) => { const Icon = item.icon; return <button type="button" draggable aria-label={`${item.label}: ${item.description}`} title={item.description} className={`page-block-library-item ${paletteDragKey === item.key ? "is-dragging" : ""}`} key={item.key} onClick={() => addBlock(item)} onDragStart={(event) => handleLibraryDragStart(event, item)} onDragEnd={handleLibraryDragEnd}><span className="page-block-icon"><Icon size={18} /></span><span><strong>{item.shortLabel ?? item.label}</strong><small>{item.description}</small></span><ArrowRight size={14} /></button>; })}</div>)}
          </section> : null}
          {selectedBlock && selectedPath ? <section ref={selectedInspectorRef} className="panel page-builder-selected-inspector" aria-label="Selected element settings" onToggle={keepAccordionOpen}>
            <div className="panel-header page-builder-inspector-header"><div><span className="eyebrow">Selected element</span><h2 className="panel-title">{blockLabel(selectedBlock)}</h2><small className="row-meta">Edit the selected item from the live canvas.</small></div><button type="button" className="icon-button" aria-label="Clear selected element" onClick={() => selectBlock(null)}><X size={15} /></button></div>
            <div className="page-builder-selected-view-switcher" role="tablist" aria-label="Selected element controls"><button type="button" role="tab" aria-selected={selectedPanel === "content"} className={selectedPanel === "content" ? "is-active" : ""} onClick={() => setSelectedPanel("content")}>{selectedBlock.type === "container" ? "Layout" : "Content"}</button><button type="button" role="tab" aria-selected={selectedPanel === "style"} className={selectedPanel === "style" ? "is-active" : ""} onClick={() => setSelectedPanel("style")}>Style</button><button type="button" role="tab" aria-selected={selectedPanel === "advanced"} className={selectedPanel === "advanced" ? "is-active" : ""} onClick={() => setSelectedPanel("advanced")}>Advanced</button></div>
            {selectedPanel === "content" ? <BlockFields block={selectedBlock} navigationMenus={navigationMenus} forms={forms} locations={locations} onChange={(key, value) => updateBlock(selectedPath, key, value)} onLayoutChange={(layout) => updateBlockLayout(selectedPath, layout)} onPreset={(preset) => applyPreset(selectedPath, preset)} /> : selectedPanel === "style" ? <PageBlockStyleFields block={selectedBlock} onChange={(style) => updateBlockStyle(selectedPath, style)} showDeviceTabs={false} /> : <PageBlockAdvancedFields block={selectedBlock} onChange={(key, value) => updateBlock(selectedPath, key, value)} onStyleChange={(style) => updateBlockStyle(selectedPath, style)} />}
          </section> : null}
          {!selectedBlock || selectedPanel === "content" ? <>
            {template ? <details className="panel page-builder-collapsible-panel" open><summary className="page-builder-collapsible-summary"><span><span className="eyebrow">Template settings</span><strong>{template.kind === "header" ? "Header" : "Footer"} setup</strong></span></summary><div className="page-builder-settings"><div className="field"><label htmlFor="template-name">Template name</label><input id="template-name" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Marketing header" required /></div><div className="field"><label htmlFor="template-status">Publishing state</label><select id="template-status" value={status} onChange={(event) => { const next = event.target.value as PageStatus; setStatus(next); if (next !== "published") setIsActive(false); }}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></div><div className="page-homepage-control"><label className="form-choice" htmlFor="template-active"><input id="template-active" type="checkbox" checked={isActive} disabled={status !== "published"} onChange={(event) => setIsActive(event.target.checked)} /><span><strong>Use this as the active {template.kind}</strong><small>Saving this choice deactivates the other published {template.kind} template.</small></span></label>{isActive ? <span className="page-home-badge">Active on public site</span> : null}</div></div></details> : null}
          </> : null}
        </aside>
        <section className="page-builder-main" aria-label="Page canvas">
          {preview ? <div className={`page-preview-panel page-builder-live-preview${blocks.length === 0 ? " is-blank-preview" : ""}`} onClick={handlePreviewClick} onContextMenu={handlePreviewContextMenu} onDragOver={handlePreviewDragOver} onDrop={handlePreviewDrop}>
            <div className={`page-preview-canvas-shell${blocks.length === 0 ? " is-blank-canvas" : ""}`} ref={previewCanvasRef}>
              {blocks.length > 0 && headerTemplate ? <div className="page-preview-template-shell page-preview-template-header" data-page-editor-template-href={isFallbackSiteTemplate(headerTemplate) ? undefined : `/admin/appearance/templates/${headerTemplate.id}/edit`}><div className="page-preview-template-toolbar"><span>Global header</span>{isFallbackSiteTemplate(headerTemplate) ? <span className="row-meta">Built-in fallback · apply migration to edit</span> : <Link href={`/admin/appearance/templates/${headerTemplate.id}/edit`} className="panel-link">Edit header</Link>}</div><PageRenderer blocks={headerTemplate.blocks} navigationMenus={navigationMenus} forms={forms} locations={locations} editorMode templateKind="header" /></div> : null}
              {blocks.length > 0 ? <div className="page-preview-page-content"><PageRenderer blocks={blocks} navigationMenus={navigationMenus} forms={forms} locations={locations} editorMode templateKind={template?.kind} /></div> : <div className="page-preview-empty page-preview-blank-canvas" role="region" aria-label="Blank HTML canvas" />}
              {blocks.length > 0 && footerTemplate ? <div className="page-preview-template-shell page-preview-template-footer" data-page-editor-template-href={isFallbackSiteTemplate(footerTemplate) ? undefined : `/admin/appearance/templates/${footerTemplate.id}/edit`}><div className="page-preview-template-toolbar"><span>Global footer</span>{isFallbackSiteTemplate(footerTemplate) ? <span className="row-meta">Built-in fallback · apply migration to edit</span> : <Link href={`/admin/appearance/templates/${footerTemplate.id}/edit`} className="panel-link">Edit footer</Link>}</div><PageRenderer blocks={footerTemplate.blocks} navigationMenus={navigationMenus} forms={forms} locations={locations} editorMode templateKind="footer" /></div> : null}
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
          {error ? <p className="form-error" role="alert">{error}</p> : null}
          {message ? <p className="form-success" role="status">{message}</p> : null}
        </section>
      </div>
    </div>
  );
}
