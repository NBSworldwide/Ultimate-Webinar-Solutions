import Link from "next/link";
import { CalendarDays, CheckCircle2, Gift, Globe2, Heart, ShieldCheck, Sparkles, Star, Trophy, Users, Video } from "lucide-react";
import { createElement, type CSSProperties, type ComponentType, type ReactNode } from "react";
import { PublicNavigation } from "@/components/public-navigation";
import type { NavigationMenuView } from "@/lib/navigation";
import { pageBlockLayoutToCss, pageBlockStyleToCss } from "@/lib/page-styles";
import { normalizeMapLocation } from "@/lib/map-location";
import { formatMoney } from "@/lib/format";
import { sanitizeHtml } from "@/lib/sanitize-html";
import type { PageBlock, ProductListItem, TestimonialView } from "@/lib/types";

function text(value: string | number | undefined): string { return typeof value === "string" ? value : ""; }

function paragraphs(value: string): ReactNode {
  return value.split(/\r?\n\s*\r?\n/).filter(Boolean).map((paragraph, index) => <p key={`${paragraph}-${index}`}>{paragraph}</p>);
}

function safeHref(value: string): string {
  if (value.startsWith("/") || /^https?:\/\//i.test(value)) return value;
  return "#";
}

function safeImageSrc(value: string): string {
  if (value.startsWith("/") || /^https:\/\//i.test(value)) return value;
  return "";
}

function titleTag(value: string): "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "div" | "span" | "p" {
  return ["h1", "h2", "h3", "h4", "h5", "h6", "div", "span", "p"].includes(value) ? value as ReturnType<typeof titleTag> : "h3";
}

function DynamicTitle({ tag, children }: { tag: ReturnType<typeof titleTag>; children: ReactNode }) {
  return createElement(tag, null, children);
}

function styledProps(block: PageBlock, extra: CSSProperties = {}): { style: CSSProperties; "data-block-style"?: "true" } {
  const css = { ...pageBlockStyleToCss(block.style), ...extra } as CSSProperties;
  return Object.keys(css).length > 0 ? { style: css, "data-block-style": "true" } : { style: css };
}

function ActionLink({ href, label, className = "", id, children }: { href: string; label: string; className?: string; id?: string; children?: ReactNode }) {
  const target = safeHref(href);
  const content = children ?? label;
  return target.startsWith("/") ? <Link className={`button ${className}`.trim()} href={target} id={id}>{content}</Link> : <a className={`button ${className}`.trim()} href={target} id={id} rel="noreferrer">{content}</a>;
}

function CatalogBlock({ block, products }: { block: PageBlock; products: ProductListItem[] }) {
  const data = block.data;
  const heading = text(data.heading) || (block.type === "product_category" ? text(data.category) || "Shop the collection" : "Featured products");
  const category = text(data.category);
  const maxItems = Math.min(12, Math.max(1, Number(data.maxItems) || 6));
  const visible = products.filter((product) => (block.type === "sale_grid" ? product.salePriceCents !== null : true) && (!category || product.category.toLowerCase() === category.toLowerCase())).slice(0, maxItems);
  return <section className="content-block content-block-products" {...styledProps(block)}><div className="content-block-section-heading"><div><span className="eyebrow">Physical goods</span><h2>{heading}</h2></div>{category ? <Link className="panel-link" href={`/products?category=${encodeURIComponent(category)}`}>View collection</Link> : null}</div>{visible.length > 0 ? <div className="product-grid">{visible.map((product) => <article className="product-card" key={product.id}><div className="product-art" aria-hidden="true"><span>{product.category}</span></div><div className="product-card-copy"><span className="eyebrow">{product.sku}</span><h3>{product.name}</h3><p>{product.description}</p><div className="product-card-footer"><strong>{formatMoney(product.priceCents)}</strong><Link href={`/products/${product.slug}`} className="button button-small">View product</Link></div></div></article>)}</div> : <p className="muted">No products are available in this collection yet.</p>}</section>;
}

function GalleryBlock({ block }: { block: PageBlock }) {
  const images = text(block.data.images).split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => {
    const [src, alt = "Gallery image", caption = ""] = line.split("|").map((value) => value.trim());
    return { src: safeImageSrc(src), alt, caption };
  }).filter((image) => image.src);
  return <section className="content-block content-block-gallery" {...styledProps(block)}><h2>{text(block.data.heading) || "Photo gallery"}</h2>{images.length > 0 ? <div className="photo-gallery">{images.map((image) => <figure key={`${image.src}-${image.alt}`}><img src={image.src} alt={image.alt} loading="lazy" />{image.caption ? <figcaption>{image.caption}</figcaption> : null}</figure>)}</div> : <p className="muted">Add one image per line in the gallery block.</p>}</section>;
}

function TestimonialBlock({ block, testimonials }: { block: PageBlock; testimonials: TestimonialView[] }) {
  const visible = testimonials.slice(0, Math.min(12, Math.max(1, Number(block.data.maxItems) || 6)));
  return <section className="content-block content-block-testimonials" {...styledProps(block)}><span className="eyebrow">Verified customers</span><h2>{text(block.data.heading) || "What customers are saying"}</h2>{visible.length > 0 ? <div className="testimonial-grid">{visible.map((testimonial) => <figure key={testimonial.id}><div aria-label={`${testimonial.rating} out of 5 stars`}>{"★".repeat(testimonial.rating)}{"☆".repeat(5 - testimonial.rating)}</div><blockquote>“{testimonial.quote}”</blockquote><figcaption><strong>{testimonial.customerName}</strong>{testimonial.productName ? <span>{testimonial.productName}</span> : null}</figcaption></figure>)}</div> : <p className="muted">Approved testimonials will appear here after review.</p>}</section>;
}

function RichTextBlock({ block }: { block: PageBlock }) {
  const body = text(block.data.body);
  const safeBody = sanitizeHtml(body);
  const hasMarkup = /<\s*\/?\s*(?:a|blockquote|br|del|div|em|figure|h[1-6]|hr|iframe|img|li|mark|ol|p|pre|s|section|small|span|strong|sub|sup|table|tbody|td|tfoot|th|thead|tr|u|ul)\b/i.test(body);
  const sizes: Record<string, string> = { small: "0.9rem", medium: "1rem", large: "1.2rem", xlarge: "1.5rem" };
  const alignments = new Set(["left", "center", "right", "justify"]);
  const textAlign = text(block.data.textAlign);
  const textColor = /^#[0-9a-f]{6}$/i.test(text(block.data.textColor)) ? text(block.data.textColor) : undefined;
  const inlineStyle: CSSProperties = { color: textColor, fontSize: sizes[text(block.data.fontSize)] ?? undefined, textAlign: alignments.has(textAlign) ? textAlign as CSSProperties["textAlign"] : undefined };
  return <section className="content-block content-block-rich-text" {...styledProps(block, inlineStyle)}>{text(block.data.heading) ? <h2>{text(block.data.heading)}</h2> : null}{hasMarkup ? <div className="rich-text-body" dangerouslySetInnerHTML={{ __html: safeBody }} /> : paragraphs(body)}</section>;
}

function NavigationBlock({ block, navigationMenus }: { block: PageBlock; navigationMenus: NavigationMenuView[] }) {
  const menu = navigationMenus.find((candidate) => candidate.id === text(block.data.menuId));
  const items = menu?.items.filter((item) => item.isVisible) ?? [];
  const layout = text(block.data.layout) === "stacked" ? "content-block-menu-stacked" : "content-block-menu-horizontal";
  return <section className="content-block content-block-navigation" {...styledProps(block)}><div className="content-block-section-heading"><div><span className="eyebrow">Navigation</span><h2>{text(block.data.heading) || menu?.name || "Explore more"}</h2></div>{menu ? <span className="row-meta">{menu.name}</span> : null}</div>{menu && items.length > 0 ? <PublicNavigation items={items} ariaLabel={menu.name} className={layout} /> : <p className="muted">Choose a saved menu in the block settings.</p>}</section>;
}

function HtmlBlock({ block }: { block: PageBlock }) {
  const html = sanitizeHtml(text(block.data.html));
  return <section className="content-block content-block-html" {...styledProps(block)}>{html ? <div dangerouslySetInnerHTML={{ __html: html }} /> : <p className="muted">Add HTML markup in the editor.</p>}</section>;
}

function ButtonBlock({ block }: { block: PageBlock }) {
  const data = block.data;
  const type = new Set(["default", "info", "success", "warning", "danger"]).has(text(data.buttonType)) ? text(data.buttonType) : "default";
  const icon = text(data.buttonIcon);
  const iconPosition = text(data.buttonIconPosition) === "right" ? "right" : "left";
  const buttonId = /^[A-Za-z][A-Za-z0-9_.:-]{0,63}$/.test(text(data.buttonId)) ? text(data.buttonId) : undefined;
  const content = iconPosition === "right" ? <><span>{text(data.buttonLabel) || "Learn more"}</span>{icon ? <span aria-hidden="true">{icon}</span> : null}</> : <>{icon ? <span aria-hidden="true">{icon}</span> : null}<span>{text(data.buttonLabel) || "Learn more"}</span></>;
  const className = `content-block content-block-button button-${type}`;
  const props = styledProps(block);
  const target = safeHref(text(data.buttonHref));
  return target.startsWith("/") ? <Link {...props} className={className} href={target} id={buttonId}>{content}</Link> : <a {...props} className={className} href={target} id={buttonId} rel="noreferrer">{content}</a>;
}

function ImageBoxBlock({ block }: { block: PageBlock }) {
  const data = block.data;
  const src = safeImageSrc(text(data.src));
  const image = src ? <img src={src} alt={text(data.title) || ""} loading="lazy" /> : <div className="content-image-placeholder">Add an image URL in the editor.</div>;
  const target = safeHref(text(data.imageLink));
  const linkedImage = text(data.imageLink) && target !== "#" ? target.startsWith("/") ? <Link href={target}>{image}</Link> : <a href={target} rel="noreferrer">{image}</a> : image;
  return <article className="content-block content-block-image-box" {...styledProps(block)}><div className="image-box-media">{linkedImage}</div><div className="image-box-copy">{text(data.title) ? <DynamicTitle tag={titleTag(text(data.titleTag))}>{text(data.title)}</DynamicTitle> : null}{text(data.description) ? <div>{paragraphs(text(data.description))}</div> : null}</div></article>;
}

type IconComponent = ComponentType<{ size?: number; strokeWidth?: number; "aria-hidden"?: boolean }>;
const iconComponents: Record<string, IconComponent> = { star: Star, heart: Heart, shield: ShieldCheck, check: CheckCircle2, sparkles: Sparkles, calendar: CalendarDays, video: Video, gift: Gift, users: Users, trophy: Trophy, facebook: Globe2, instagram: Globe2, youtube: Globe2, linkedin: Globe2 };

function IconGlyph({ name, url }: { name: string; url: string }) {
  const src = safeImageSrc(url);
  if (src) return <img className="icon-box-custom-icon" src={src} alt="" aria-hidden="true" />;
  const Icon = iconComponents[name] ?? Star;
  return <Icon size={28} strokeWidth={1.8} aria-hidden={true} />;
}

function IconBoxBlock({ block }: { block: PageBlock }) {
  const data = block.data;
  const target = safeHref(text(data.link));
  const view = new Set(["default", "stacked", "framed"]).has(text(data.iconView)) ? text(data.iconView) : "framed";
  const content = <><div className={`icon-box-icon icon-box-icon-${view}`}><IconGlyph name={text(data.iconName)} url={text(data.iconUrl)} /></div><div className="icon-box-copy">{text(data.title) ? <DynamicTitle tag={titleTag(text(data.titleTag))}>{text(data.title)}</DynamicTitle> : null}{text(data.description) ? <div>{paragraphs(text(data.description))}</div> : null}</div></>;
  const body = text(data.link) && target !== "#" ? target.startsWith("/") ? <Link href={target}>{content}</Link> : <a href={target} rel="noreferrer">{content}</a> : content;
  return <article className={`content-block content-block-icon-box icon-box-view-${view}`} {...styledProps(block)}>{body}</article>;
}

function MapBlock({ block }: { block: PageBlock }) {
  const resolved = normalizeMapLocation(block.data);
  const location = resolved?.label ?? "";
  const zoom = Math.min(20, Math.max(1, Number(block.data.zoom) || 10));
  const height = Math.min(1_200, Math.max(160, Number(block.data.height) || 360));
  const query = encodeURIComponent(resolved?.query ?? "");
  const embedUrl = location ? `https://www.google.com/maps?q=${query}&z=${zoom}&output=embed` : "";
  const mapLink = location ? `https://www.google.com/maps/search/?api=1&query=${query}` : "";
  return <section className="content-block content-block-map" {...styledProps(block, { height: `${height}px`, minHeight: `${height}px` })}>{embedUrl ? <iframe title={`Map of ${location}`} src={embedUrl} loading="lazy" referrerPolicy="no-referrer-when-downgrade" /> : <div className="content-map-placeholder">Add an address or valid coordinates in the editor to show a map.</div>}{mapLink ? <a className="content-map-link" href={mapLink} target="_blank" rel="noreferrer">Open in Google Maps</a> : null}</section>;
}

function ContainerBlock({ block, products, testimonials, navigationMenus }: { block: PageBlock; products: ProductListItem[]; testimonials: TestimonialView[]; navigationMenus: NavigationMenuView[] }) {
  const css = { ...pageBlockStyleToCss(block.style), ...pageBlockLayoutToCss(block.layout) };
  const props = styledProps(block, css as CSSProperties);
  return <section className="content-block content-block-container" {...props}><div className="content-block-container-inner"><PageRenderer blocks={block.children ?? []} products={products} testimonials={testimonials} navigationMenus={navigationMenus} className="content-page-renderer-nested" /></div></section>;
}

export function PageRenderer({ blocks, products = [], testimonials = [], navigationMenus = [], className = "" }: { blocks: PageBlock[]; products?: ProductListItem[]; testimonials?: TestimonialView[]; navigationMenus?: NavigationMenuView[]; className?: string }) {
  return <div className={`content-page-renderer ${className}`.trim()}>{blocks.map((block) => {
    const data = block.data;
    if (block.type === "container") return <ContainerBlock key={block.id} block={block} products={products} testimonials={testimonials} navigationMenus={navigationMenus} />;
    if (block.type === "hero") return <section className="content-block content-block-hero" {...styledProps(block)} key={block.id}><span className="eyebrow">{text(data.eyebrow) || "Featured content"}</span><h1>{text(data.heading) || "A page built for your audience."}</h1>{text(data.body) ? <div className="content-block-copy">{paragraphs(text(data.body))}</div> : null}{text(data.ctaLabel) ? <ActionLink href={text(data.ctaHref)} label={text(data.ctaLabel)} /> : null}</section>;
    if (block.type === "rich_text") return <RichTextBlock key={block.id} block={block} />;
    if (block.type === "image") return <figure className="content-block content-block-image" {...styledProps(block)} key={block.id}>{safeImageSrc(text(data.src)) ? <img src={safeImageSrc(text(data.src))} alt={text(data.alt)} loading="lazy" /> : <div className="content-image-placeholder">Add an image URL in the editor.</div>}{text(data.caption) ? <figcaption>{text(data.caption)}</figcaption> : null}</figure>;
    if (block.type === "image_box") return <ImageBoxBlock key={block.id} block={block} />;
    if (block.type === "icon_box") return <IconBoxBlock key={block.id} block={block} />;
    if (block.type === "button") return <ButtonBlock key={block.id} block={block} />;
    if (block.type === "cta") return <section className="content-block content-block-cta" {...styledProps(block)} key={block.id}><div><span className="eyebrow">Next step</span><h2>{text(data.heading) || "Keep the conversation moving."}</h2>{text(data.body) ? <div className="content-block-copy">{paragraphs(text(data.body))}</div> : null}</div>{text(data.buttonLabel) ? <ActionLink href={text(data.buttonHref)} label={text(data.buttonLabel)} /> : null}</section>;
    if (block.type === "product_grid" || block.type === "product_category" || block.type === "sale_grid") return <CatalogBlock key={block.id} block={block} products={products} />;
    if (block.type === "gallery") return <GalleryBlock key={block.id} block={block} />;
    if (block.type === "testimonial_grid") return <TestimonialBlock key={block.id} block={block} testimonials={testimonials} />;
    if (block.type === "navigation_menu") return <NavigationBlock key={block.id} block={block} navigationMenus={navigationMenus} />;
    if (block.type === "html") return <HtmlBlock key={block.id} block={block} />;
    if (block.type === "map") return <MapBlock key={block.id} block={block} />;
    return <div className="content-block content-block-spacer" {...styledProps(block, { height: `${Math.min(240, Math.max(12, Number(data.height) || 48))}px` })} aria-hidden="true" key={block.id} />;
  })}</div>;
}
