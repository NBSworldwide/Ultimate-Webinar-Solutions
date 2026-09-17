"use client";

import { useRef, useState, type DragEvent, type FormEvent } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Code2, Copy, GripVertical, Image, LayoutTemplate, Menu, Megaphone, Minus, MousePointer, Package, Plus, Save, Trash2, Type } from "lucide-react";
import Link from "next/link";
import { PageRenderer } from "@/components/page-renderer";
import { PageBlockStyleFields } from "@/components/page-block-style-fields";
import type { NavigationMenuView } from "@/lib/navigation";
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
  PageContainerMode,
  PageContainerWrap,
  PageStatus,
} from "@/lib/types";
import { useRouter } from "next/navigation";

type BlockPath = number[];

const blockLibrary: Array<{ type: PageBlockType; label: string; description: string; icon: typeof LayoutTemplate }> = [
  { type: "container", label: "Container", description: "Build a nested Flexbox or Grid layout.", icon: LayoutTemplate },
  { type: "hero", label: "Hero", description: "Lead with a headline and call to action.", icon: LayoutTemplate },
  { type: "rich_text", label: "Rich text", description: "Add a heading and readable body copy.", icon: Type },
  { type: "image", label: "Image", description: "Show a hosted image with alt text.", icon: Image },
  { type: "image_box", label: "Image box", description: "Combine an image, title, description, and link.", icon: Image },
  { type: "icon_box", label: "Icon box", description: "Use a library icon with supporting content.", icon: LayoutTemplate },
  { type: "map", label: "Google Maps", description: "Show a location with a safe map embed.", icon: LayoutTemplate },
  { type: "button", label: "Button", description: "Add a styled link or call to action.", icon: MousePointer },
  { type: "cta", label: "Call to action", description: "Close with a focused next step.", icon: Megaphone },
  { type: "product_grid", label: "Product grid", description: "Feature purchasable products on a page.", icon: Package },
  { type: "product_category", label: "Product category", description: "Show a filtered collection of products.", icon: Package },
  { type: "sale_grid", label: "Sale items", description: "Highlight products with active sale pricing.", icon: Package },
  { type: "gallery", label: "Photo gallery", description: "Show an ordered gallery with captions and alt text.", icon: Image },
  { type: "testimonial_grid", label: "Testimonials", description: "Display approved feedback from verified customers.", icon: Type },
  { type: "navigation_menu", label: "Navigation menu", description: "Place a saved menu into this page.", icon: Menu },
  { type: "html", label: "HTML / embed", description: "Insert sanitized semantic HTML or an approved video embed.", icon: Code2 },
  { type: "spacer", label: "Spacer", description: "Add intentional breathing room.", icon: Minus },
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

function newBlock(type: PageBlockType): PageBlock {
  const data: Record<string, string | number> = type === "hero"
    ? { eyebrow: "Featured content", heading: "A page built for your audience.", body: "Introduce this page with clear, useful context.", ctaLabel: "Explore sessions", ctaHref: "/webinars" }
    : type === "rich_text" ? { heading: "A useful section", body: "Add the supporting content your visitors need here.", textColor: "", fontSize: "medium", textAlign: "left" }
      : type === "image" ? { src: "", alt: "", caption: "", imageResolution: "full", imageLinkMode: "none", imageLink: "" }
        : type === "image_box" ? { src: "", imageResolution: "full", title: "Feature title", description: "Describe this feature for your visitors.", imageLink: "", titleTag: "h3" }
          : type === "icon_box" ? { iconSource: "fontawesome-solid", iconName: "shield", iconView: "framed", iconUrl: "", title: "Feature title", description: "Describe this feature for your visitors.", link: "", titleTag: "h3" }
            : type === "map" ? { locationMode: "address", address: "", latitude: "", longitude: "", zoom: 10, height: 360 }
              : type === "button" ? { buttonLabel: "Explore sessions", buttonHref: "/webinars", buttonType: "default", buttonIcon: "", buttonIconPosition: "left", buttonId: "" }
              : type === "cta" ? { heading: "Ready for the next step?", body: "Give visitors one clear action to take next.", buttonLabel: "Contact us", buttonHref: "/login" }
                : type === "product_grid" ? { heading: "Featured products", maxItems: 6 }
                  : type === "product_category" ? { heading: "Shop the collection", category: "Event kits", maxItems: 6 }
                    : type === "sale_grid" ? { heading: "Limited-time offers", maxItems: 6 }
                      : type === "gallery" ? { heading: "Photo gallery", images: "" }
                        : type === "testimonial_grid" ? { heading: "What customers are saying", maxItems: 6 }
                          : type === "navigation_menu" ? { heading: "Explore more", menuId: "", layout: "horizontal" }
                            : type === "html" ? { html: "<section class=\"embed-card\"><h2>Custom HTML section</h2><p>Add a safe, reusable markup snippet here.</p></section>" }
                              : { height: 48 };
  if (type === "container") {
    return {
      id: crypto.randomUUID(),
      type,
      data: {},
      layout: { mode: "flex", contentWidth: "boxed", direction: "column", justifyContent: "start", alignItems: "stretch", columnGap: 24, rowGap: 24, wrap: "nowrap", columns: 2, rows: 1, autoFlow: "row", justifyItems: "stretch", gridOutline: false },
      children: [],
    };
  }
  return { id: crypto.randomUUID(), type, data };
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
  block.layout = { mode: "flex", contentWidth: "full", direction: "column", justifyContent: "start", alignItems: "stretch", columnGap: 16, rowGap: 16, wrap: "nowrap" };
  if (width !== undefined) block.style = { widthMode: "custom", width: { desktop: width }, maxWidth: { desktop: width } };
  return block;
}

function ContainerFields({ block, onChange, onPreset }: { block: PageBlock; onChange: (layout: PageBlockLayout) => void; onPreset: (preset: typeof containerPresets[number]) => void }) {
  const layout = block.layout ?? {};
  const mode = layout.mode ?? "flex";

  return <div className="page-builder-fields page-container-fields">
    <div className="page-container-heading"><div><strong>Container layout</strong><small>Choose a structure, then add blocks inside each column.</small></div><span className="page-container-badge">{mode === "grid" ? "Grid" : "Flexbox"}</span></div>
    <div className="page-container-presets" aria-label="Container structure presets">
      {containerPresets.map((preset) => <button type="button" className="page-container-preset" key={preset.key} onClick={() => onPreset(preset)}><span className="page-container-preset-visual" data-slots={preset.slots} data-mode={preset.mode}>{Array.from({ length: preset.slots }).map((_, index) => <i key={index} />)}</span><strong>{preset.label}</strong><small>{preset.description}</small></button>)}
    </div>
    <div className="page-style-grid">
      <label className="field"><span>Container layout</span><select value={mode} onChange={(event) => onChange({ ...layout, mode: event.target.value as PageContainerMode })}><option value="flex">Flexbox</option><option value="grid">Grid</option></select></label>
      <label className="field"><span>Content width</span><select value={layout.contentWidth ?? "boxed"} onChange={(event) => onChange({ ...layout, contentWidth: event.target.value as PageContainerContentWidth })}><option value="boxed">Boxed</option><option value="full">Full width</option></select></label>
      <label className="field"><span>Width (pixels)</span><input type="number" min="0" max="3000" value={layout.width ?? ""} onChange={(event) => onChange({ ...layout, width: numberValue(event.target.value) })} /></label>
      <label className="field"><span>Minimum height</span><input type="number" min="0" max="3000" value={layout.minHeight ?? ""} onChange={(event) => onChange({ ...layout, minHeight: numberValue(event.target.value) })} /></label>
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
      <label className="field"><span>Column gap</span><input type="number" min="0" max="300" value={layout.columnGap ?? 24} onChange={(event) => onChange({ ...layout, columnGap: numberValue(event.target.value) })} /><small>Pixels between columns.</small></label>
      <label className="field"><span>Row gap</span><input type="number" min="0" max="300" value={layout.rowGap ?? 24} onChange={(event) => onChange({ ...layout, rowGap: numberValue(event.target.value) })} /><small>Pixels between rows.</small></label>
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

function BlockFields({ block, navigationMenus, onChange, onLayoutChange, onPreset }: { block: PageBlock; navigationMenus: NavigationMenuView[]; onChange: (key: string, value: string | number) => void; onLayoutChange: (layout: PageBlockLayout) => void; onPreset: (preset: typeof containerPresets[number]) => void }) {
  const field = (key: string, label: string, multiline = false) => <div className="field" key={key}><label htmlFor={`page-${block.id}-${key}`}>{label}</label>{multiline ? <textarea id={`page-${block.id}-${key}`} value={String(block.data[key] ?? "")} onChange={(event) => onChange(key, event.target.value)} /> : <input id={`page-${block.id}-${key}`} value={String(block.data[key] ?? "")} onChange={(event) => onChange(key, event.target.value)} />}</div>;
  if (block.type === "container") return <ContainerFields block={block} onChange={onLayoutChange} onPreset={onPreset} />;
  if (block.type === "hero") return <div className="page-builder-fields">{field("eyebrow", "Eyebrow")}{field("heading", "Heading")}{field("body", "Body copy", true)}<div className="form-row">{field("ctaLabel", "Button label")}{field("ctaHref", "Button link")}</div></div>;
  if (block.type === "rich_text") return <RichTextFields block={block} onChange={onChange} />;
  if (block.type === "image") return <div className="page-builder-fields">{field("src", "Image URL")}{field("alt", "Alt text")}{field("caption", "Caption")}<div className="form-row"><label className="field"><span>Image resolution</span><select value={String(block.data.imageResolution ?? "full")} onChange={(event) => onChange("imageResolution", event.target.value)}><option value="thumbnail">Thumbnail</option><option value="medium">Medium</option><option value="large">Large</option><option value="full">Full</option><option value="custom">Custom</option></select></label><label className="field"><span>Image link</span><select value={String(block.data.imageLinkMode ?? "none")} onChange={(event) => onChange("imageLinkMode", event.target.value)}><option value="none">None</option><option value="media">Media file</option><option value="custom">Custom URL</option></select></label></div>{String(block.data.imageLinkMode ?? "none") === "custom" ? field("imageLink", "Custom image link") : null}<small>Resolution is retained as media metadata; remote images use the source URL until a native media pipeline is connected.</small></div>;
  if (block.type === "image_box") return <div className="page-builder-fields">{field("src", "Image URL")}<div className="form-row"><label className="field"><span>Image resolution</span><select value={String(block.data.imageResolution ?? "full")} onChange={(event) => onChange("imageResolution", event.target.value)}><option value="thumbnail">Thumbnail</option><option value="medium">Medium</option><option value="large">Large</option><option value="full">Full</option><option value="custom">Custom</option></select></label>{field("imageLink", "Link")}</div>{field("title", "Title")}{field("description", "Description", true)}<label className="field"><span>Title HTML tag</span><select value={String(block.data.titleTag ?? "h3")} onChange={(event) => onChange("titleTag", event.target.value)}>{["h1", "h2", "h3", "h4", "h5", "h6", "div", "span", "p"].map((tag) => <option key={tag} value={tag}>{tag.toUpperCase()}</option>)}</select></label><small>The shared Style and Advanced controls below apply to the whole Image Box.</small></div>;
  if (block.type === "icon_box") return <div className="page-builder-fields"><div className="form-row"><label className="field"><span>Icon source</span><select value={String(block.data.iconSource ?? "fontawesome-solid")} onChange={(event) => onChange("iconSource", event.target.value)}>{iconSources.map((source) => <option key={source.value} value={source.value}>{source.label}</option>)}</select></label><label className="field"><span>View</span><select value={String(block.data.iconView ?? "framed")} onChange={(event) => onChange("iconView", event.target.value)}><option value="default">Default</option><option value="stacked">Stacked</option><option value="framed">Framed</option></select></label></div><label className="field"><span>Icon library</span><select value={String(block.data.iconName ?? "shield")} onChange={(event) => onChange("iconName", event.target.value)}>{iconNames.map((icon) => <option key={icon.value} value={icon.value}>{icon.label}</option>)}</select></label>{field("iconUrl", "Custom SVG or icon asset URL")} {field("title", "Title")}{field("description", "Description", true)}{field("link", "Link")}<label className="field"><span>Title HTML tag</span><select value={String(block.data.titleTag ?? "h3")} onChange={(event) => onChange("titleTag", event.target.value)}>{["h1", "h2", "h3", "h4", "h5", "h6", "div", "span", "p"].map((tag) => <option key={tag} value={tag}>{tag.toUpperCase()}</option>)}</select></label><small>Font Awesome source groups are represented by an allow-listed native icon catalog. Use a validated asset URL for a custom SVG; raw SVG markup is never rendered.</small></div>;
  if (block.type === "map") {
    const locationMode = String(block.data.locationMode ?? "address") === "coordinates" ? "coordinates" : "address";
    return <div className="page-builder-fields"><label className="field"><span>Location input</span><select value={locationMode} onChange={(event) => onChange("locationMode", event.target.value)}><option value="address">Street address or place</option><option value="coordinates">Latitude and longitude</option></select></label>{locationMode === "coordinates" ? <div className="form-row"><label className="field"><span>Latitude</span><input type="number" min="-90" max="90" step="any" value={String(block.data.latitude ?? "")} onChange={(event) => onChange("latitude", event.target.value)} placeholder="32.7357" /></label><label className="field"><span>Longitude</span><input type="number" min="-180" max="180" step="any" value={String(block.data.longitude ?? "")} onChange={(event) => onChange("longitude", event.target.value)} placeholder="-97.1081" /></label></div> : <label className="field"><span>Street address or place</span><input value={String(block.data.address ?? block.data.location ?? "")} onChange={(event) => onChange("address", event.target.value)} placeholder="123 Main Street, Arlington, TX 76014" /></label>}<div className="form-row">{field("zoom", "Zoom")}{field("height", "Height (pixels)")}</div><small>Use a full street address with ZIP code, a place name, or switch to coordinates and enter latitude from -90 to 90 and longitude from -180 to 180. The published map uses a safe Google Maps embed URL and opens the full map in a separate tab.</small></div>;
  }
  if (block.type === "button") return <div className="page-builder-fields">{field("buttonLabel", "Button text")}{field("buttonHref", "Button link")}<div className="form-row"><label className="field"><span>Button type</span><select value={String(block.data.buttonType ?? "default")} onChange={(event) => onChange("buttonType", event.target.value)}><option value="default">Default</option><option value="info">Info</option><option value="success">Success</option><option value="warning">Warning</option><option value="danger">Danger</option></select></label>{field("buttonId", "Button ID")}</div><div className="form-row">{field("buttonIcon", "Optional icon")}<label className="field"><span>Icon position</span><select value={String(block.data.buttonIconPosition ?? "left")} onChange={(event) => onChange("buttonIconPosition", event.target.value)}><option value="left">Left</option><option value="right">Right</option></select></label></div><small>Use a short text symbol or emoji for the optional icon. Button links are limited to safe internal or HTTPS destinations when published.</small></div>;
  if (block.type === "cta") return <div className="page-builder-fields">{field("heading", "Heading")}{field("body", "Body copy", true)}<div className="form-row">{field("buttonLabel", "Button label")}{field("buttonHref", "Button link")}</div></div>;
  if (block.type === "product_grid") return <div className="page-builder-fields">{field("heading", "Heading")}{field("category", "Optional category filter")}{field("maxItems", "Maximum products")}</div>;
  if (block.type === "product_category") return <div className="page-builder-fields">{field("heading", "Heading")}{field("category", "Category name")}{field("maxItems", "Maximum products")}</div>;
  if (block.type === "sale_grid") return <div className="page-builder-fields">{field("heading", "Heading")}{field("maxItems", "Maximum products")}</div>;
  if (block.type === "gallery") return <div className="page-builder-fields">{field("heading", "Heading")}{field("images", "Images", true)}<small>One image per line. Use the format: image URL | alt text | caption</small></div>;
  if (block.type === "testimonial_grid") return <div className="page-builder-fields">{field("heading", "Heading")}{field("maxItems", "Maximum testimonials")}</div>;
  if (block.type === "navigation_menu") return <div className="page-builder-fields">{field("heading", "Heading")}<div className="field"><label htmlFor={`page-${block.id}-menuId`}>Menu</label><select id={`page-${block.id}-menuId`} value={String(block.data.menuId ?? "")} onChange={(event) => onChange("menuId", event.target.value)}><option value="">Choose a saved menu</option>{navigationMenus.map((menu) => <option key={menu.id} value={menu.id}>{menu.name} · {menu.locations.join(", ")}</option>)}</select></div><div className="field"><label htmlFor={`page-${block.id}-layout`}>Layout</label><select id={`page-${block.id}-layout`} value={String(block.data.layout ?? "horizontal")} onChange={(event) => onChange("layout", event.target.value)}><option value="horizontal">Horizontal links</option><option value="stacked">Stacked links</option></select></div><small>The page uses the menu’s current labels, order, and nested items when it renders.</small></div>;
  if (block.type === "html") return <div className="page-builder-fields">{field("html", "HTML markup", true)}<small>Safe tags, links, images, and approved YouTube or Vimeo frames are retained. Scripts, forms, and unsafe embeds are removed when the page is saved.</small></div>;
  return <div className="page-builder-fields">{field("height", "Height (pixels)")}</div>;
}

function BlockEditor({ block, path, count, navigationMenus, dragPath, onChange, onStyleChange, onLayoutChange, onPreset, onAddChild, onMove, onDuplicate, onDelete, onDragStart, onDragEnd, onDropBefore, onDropInto }: {
  block: PageBlock;
  path: BlockPath;
  count: number;
  navigationMenus: NavigationMenuView[];
  dragPath: BlockPath | null;
  onChange: (path: BlockPath, key: string, value: string | number) => void;
  onStyleChange: (path: BlockPath, style: PageBlockStyle | undefined) => void;
  onLayoutChange: (path: BlockPath, layout: PageBlockLayout) => void;
  onPreset: (path: BlockPath, preset: typeof containerPresets[number]) => void;
  onAddChild: (path: BlockPath, type: PageBlockType) => void;
  onMove: (path: BlockPath, offset: number) => void;
  onDuplicate: (path: BlockPath) => void;
  onDelete: (path: BlockPath) => void;
  onDragStart: (path: BlockPath) => void;
  onDragEnd: () => void;
  onDropBefore: (path: BlockPath) => void;
  onDropInto: (path: BlockPath) => void;
}) {
  const label = blockLibrary.find((item) => item.type === block.type)?.label ?? block.type;
  const children = block.children ?? [];
  const [childType, setChildType] = useState<PageBlockType>("rich_text");
  const isDragging = dragPath ? pathEquals(dragPath, path) : false;
  const displayIndex = path[path.length - 1] + 1;
  function handleDragStart(event: DragEvent<HTMLElement>) { event.stopPropagation(); onDragStart(path); }
  function handleDropBefore(event: DragEvent<HTMLElement>) { event.preventDefault(); event.stopPropagation(); onDropBefore(path); }

  return <article className={`page-builder-block ${block.type === "container" ? "page-builder-block-container" : ""} ${isDragging ? "is-dragging" : ""}`} draggable onDragStart={handleDragStart} onDragEnd={onDragEnd} onDragOver={(event) => event.preventDefault()} onDrop={handleDropBefore}>
    <header className="page-builder-block-header"><span className="page-builder-drag-handle" title="Drag to reorder" aria-label="Drag to reorder"><GripVertical size={16} /><strong>{displayIndex}. {label}</strong></span><div className="page-builder-block-actions"><button type="button" className="icon-button" onClick={() => onMove(path, -1)} disabled={displayIndex === 1} aria-label="Move block up"><ArrowUp size={14} /></button><button type="button" className="icon-button" onClick={() => onMove(path, 1)} disabled={displayIndex === count} aria-label="Move block down"><ArrowDown size={14} /></button><button type="button" className="icon-button" onClick={() => onDuplicate(path)} aria-label="Duplicate block"><Copy size={14} /></button><button type="button" className="icon-button icon-button-danger" onClick={() => onDelete(path)} aria-label="Delete block"><Trash2 size={14} /></button></div></header>
    <BlockFields block={block} navigationMenus={navigationMenus} onChange={(key, value) => onChange(path, key, value)} onLayoutChange={(layout) => onLayoutChange(path, layout)} onPreset={(preset) => onPreset(path, preset)} />
    {block.type === "container" ? <div className="page-builder-container-children" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); event.stopPropagation(); onDropInto(path); }}><div className="page-builder-children-heading"><div><strong>Nested content</strong><small>Drop blocks here or add a block to this container.</small></div><span>{children.length} {children.length === 1 ? "block" : "blocks"}</span></div>{children.length > 0 ? children.map((child, index) => <BlockEditor key={child.id} block={child} path={[...path, index]} count={children.length} navigationMenus={navigationMenus} dragPath={dragPath} onChange={onChange} onStyleChange={onStyleChange} onLayoutChange={onLayoutChange} onPreset={onPreset} onAddChild={onAddChild} onMove={onMove} onDuplicate={onDuplicate} onDelete={onDelete} onDragStart={onDragStart} onDragEnd={onDragEnd} onDropBefore={onDropBefore} onDropInto={onDropInto} />) : <div className="page-builder-dropzone"><Plus size={16} />Drop a block into this container</div>}<div className="page-builder-child-add"><select aria-label="Choose a nested block" value={childType} onChange={(event) => setChildType(event.target.value as PageBlockType)}>{blockLibrary.map((item) => <option key={item.type} value={item.type}>{item.label}</option>)}</select><button type="button" className="button button-secondary button-small" onClick={() => onAddChild(path, childType)}><Plus size={14} /> Add nested block</button></div></div> : null}
    <PageBlockStyleFields block={block} onChange={(style) => onStyleChange(path, style)} />
  </article>;
}

export function PageBuilder({ page, navigationMenus = [] }: { page?: ContentPage; navigationMenus?: NavigationMenuView[] }) {
  const router = useRouter();
  const [title, setTitle] = useState(() => page?.title ?? "");
  const [slug, setSlug] = useState(() => page?.slug ?? "");
  const [excerpt, setExcerpt] = useState(() => page?.excerpt ?? "");
  const [status, setStatus] = useState<PageStatus>(() => page?.status ?? "draft");
  const [seoTitle, setSeoTitle] = useState(() => page?.seoTitle ?? "");
  const [seoDescription, setSeoDescription] = useState(() => page?.seoDescription ?? "");
  const [blocks, setBlocks] = useState<PageBlock[]>(() => page?.blocks ?? [newBlock("hero"), newBlock("rich_text")]);
  const [dragPath, setDragPath] = useState<BlockPath | null>(null);
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  function addBlock(type: PageBlockType) { setBlocks((current) => [...current, newBlock(type)]); setMessage(""); }
  function addChild(path: BlockPath, type: PageBlockType) { setBlocks((current) => updateBlockAtPath(current, path, (block) => block.type === "container" ? { ...block, children: [...(block.children ?? []), newBlock(type)] } : block)); setMessage(""); }
  function updateBlock(path: BlockPath, key: string, value: string | number) { setBlocks((current) => updateBlockAtPath(current, path, (block) => updateBlockData(block, key, value))); }
  function updateBlockStyle(path: BlockPath, style: PageBlockStyle | undefined) { setBlocks((current) => updateBlockAtPath(current, path, (block) => ({ ...block, style }))); }
  function updateBlockLayout(path: BlockPath, layout: PageBlockLayout) { setBlocks((current) => updateBlockAtPath(current, path, (block) => ({ ...block, layout }))); }
  function applyPreset(path: BlockPath, preset: typeof containerPresets[number]) {
    setBlocks((current) => updateBlockAtPath(current, path, (block) => {
      if (block.type !== "container") return block;
      const children = (block.children?.length ?? 0) > 0 ? block.children : Array.from({ length: preset.slots }, (_, index) => makeColumnContainer(preset.widths?.[index]));
      return { ...block, layout: { ...block.layout, ...preset.layout, contentWidth: block.layout?.contentWidth ?? "boxed", justifyContent: block.layout?.justifyContent ?? "start", alignItems: block.layout?.alignItems ?? "stretch", columnGap: block.layout?.columnGap ?? 24, rowGap: block.layout?.rowGap ?? 24, wrap: block.layout?.wrap ?? "nowrap" }, children };
    }));
  }
  function moveBlock(path: BlockPath, offset: number) { setBlocks((current) => moveWithinParent(current, path, offset)); }
  function duplicateBlock(path: BlockPath) { setBlocks((current) => { const source = getBlockAtPath(current, path); return source ? insertAfterPath(current, path, cloneBlock(source)) : current; }); }
  function deleteBlock(path: BlockPath) { setBlocks((current) => removeBlockAtPath(current, path).blocks); }
  function dropBefore(targetPath: BlockPath) { if (!dragPath) return; setBlocks((current) => moveBlockBefore(current, dragPath, targetPath)); setDragPath(null); }
  function dropInto(targetPath: BlockPath) { if (!dragPath) return; setBlocks((current) => moveBlockInto(current, dragPath, targetPath)); setDragPath(null); }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(""); setMessage("");
    try {
      const response = await fetch(page ? `/api/admin/pages/${encodeURIComponent(page.id)}` : "/api/admin/pages", { method: page ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, slug: slug || slugify(title), excerpt, status, blocks, seoTitle, seoDescription }) });
      const data = await response.json() as { page?: { id: string; slug: string }; error?: string };
      if (!response.ok || !data.page) throw new Error(data.error ?? "The page could not be saved.");
      if (!page) router.push(`/admin/pages/${data.page.id}/edit`);
      else setMessage("Page saved.");
    } catch (failure) { setError(failure instanceof Error ? failure.message : "The page could not be saved."); } finally { setSaving(false); }
  }

  return <form className="page-builder" onSubmit={save}><div className="page-builder-toolbar"><div><span className="eyebrow">Visual page editor</span><h1 className="page-title">{page ? "Edit page" : "Create a page"}</h1><p className="page-subtitle">Compose reusable blocks, choose Flexbox or Grid structures, drag nested blocks into place, then publish when the page is ready.</p></div><div className="detail-actions"><Link href="/admin/pages" className="button button-secondary"><ArrowLeft size={14} /> Pages</Link><button type="button" className={`button button-secondary ${preview ? "button-active" : ""}`} onClick={() => setPreview((current) => !current)}>{preview ? "Edit blocks" : "Preview page"}</button><button className="button" type="submit" disabled={saving}><Save size={14} />{saving ? "Saving…" : "Save page"}</button></div></div><div className="page-builder-layout"><section className="page-builder-main"><div className="admin-form-card page-builder-settings"><div className="form-row"><div className="field"><label htmlFor="page-title">Page title</label><input id="page-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="About our studio" required /></div><div className="field"><label htmlFor="page-slug">URL slug</label><input id="page-slug" value={slug} onChange={(event) => setSlug(slugify(event.target.value))} placeholder="about-our-studio" required={Boolean(page)} /><small>Public URL: /pages/{slug || slugify(title) || "your-page"}</small></div></div><div className="form-row"><div className="field"><label htmlFor="page-status">Publishing state</label><select id="page-status" value={status} onChange={(event) => setStatus(event.target.value as PageStatus)}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></div><div className="field"><label htmlFor="page-excerpt">Excerpt</label><input id="page-excerpt" value={excerpt} onChange={(event) => setExcerpt(event.target.value)} placeholder="A short summary for listings and previews." /></div></div></div>{preview ? <div className="page-preview-panel"><div className="page-preview-label"><span className="eyebrow">Live preview</span><span>{blocks.length} top-level blocks</span></div><PageRenderer blocks={blocks} navigationMenus={navigationMenus} /></div> : <div className="page-builder-canvas">{blocks.length === 0 ? <div className="page-builder-empty"><Plus size={20} /><h2>Start building your page</h2><p>Choose a block from the library to add your first section.</p></div> : blocks.map((block, index) => <BlockEditor key={block.id} block={block} path={[index]} count={blocks.length} navigationMenus={navigationMenus} dragPath={dragPath} onChange={updateBlock} onStyleChange={updateBlockStyle} onLayoutChange={updateBlockLayout} onPreset={applyPreset} onAddChild={addChild} onMove={moveBlock} onDuplicate={duplicateBlock} onDelete={deleteBlock} onDragStart={setDragPath} onDragEnd={() => setDragPath(null)} onDropBefore={dropBefore} onDropInto={dropInto} />)}</div>}{error ? <p className="form-error" role="alert">{error}</p> : null}{message ? <p className="form-success" role="status">{message}</p> : null}</section><aside className="page-builder-sidebar"><section className="panel page-block-library"><div className="panel-header"><div><span className="eyebrow">Blocks</span><h2 className="panel-title">Add content</h2></div><Plus size={16} color="#8b9995" /></div>{blockLibrary.map(({ type, label, description, icon: Icon }) => <button type="button" className="page-block-library-item" key={type} onClick={() => addBlock(type)}><span className="page-block-icon"><Icon size={15} /></span><span><strong>{label}</strong><small>{description}</small></span><ArrowRight size={14} /></button>)}</section><section className="panel page-seo-panel"><div className="panel-header"><div><span className="eyebrow">Search appearance</span><h2 className="panel-title">SEO fields</h2></div></div><div className="form-grid"><div className="field"><label htmlFor="page-seo-title">SEO title</label><input id="page-seo-title" value={seoTitle} onChange={(event) => setSeoTitle(event.target.value)} placeholder={title || "Page title"} /></div><div className="field"><label htmlFor="page-seo-description">SEO description</label><textarea id="page-seo-description" value={seoDescription} onChange={(event) => setSeoDescription(event.target.value)} placeholder={excerpt || "Search description"} /></div></div></section></aside></div></form>;
}
