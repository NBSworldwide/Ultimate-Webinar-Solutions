import Link from "next/link";
import { ArrowUpRight, CalendarDays, CheckCircle2, Gift, Globe2, Heart, MapPin, Plus, ShieldCheck, Sparkles, Star, Trophy, Users, Video } from "lucide-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { faCalendar as faCalendarRegular, faCircleCheck as faCircleCheckRegular, faHeart as faHeartRegular, faStar as faStarRegular } from "@fortawesome/free-regular-svg-icons";
import { faFacebook, faInstagram, faLinkedin, faYoutube } from "@fortawesome/free-brands-svg-icons";
import { faCalendar as faCalendarSolid, faCircleCheck, faGift as faGiftSolid, faHeart as faHeartSolid, faShieldHalved, faStar as faStarSolid, faTrophy as faTrophySolid, faUsers as faUsersSolid, faVideo as faVideoSolid, faWandMagicSparkles } from "@fortawesome/free-solid-svg-icons";
import { Children, cloneElement, createElement, Fragment, isValidElement, type CSSProperties, type ComponentType, type ReactElement, type ReactNode } from "react";
import { PublicNavigation } from "@/components/public-navigation";
import { FormRenderer } from "@/components/form-renderer";
import { LocationDetailTemplate } from "@/components/location-detail-template";
import { ProductCard, type ProductCardOptions } from "@/components/product-card";
import { VideoBlockClient } from "@/components/video-block";
import { BackgroundLayer } from "@/components/background-layer";
import { MapPlaceCard } from "@/components/map-place-card";
import type { NavigationMenuView } from "@/lib/navigation";
import { pageBlockLayoutToCss, pageBlockStyleToCss } from "@/lib/page-styles";
import { normalizeMapLocation } from "@/lib/map-location";
import { formatMoney } from "@/lib/format";
import { sanitizeHtml } from "@/lib/sanitize-html";
import { safeLinkAttributes } from "@/lib/link-attributes";
import { serviceLocations, type ServiceLocation } from "@/content/locations";
import type { FormDefinition, PageBlock, ProductListItem, SiteTemplateKind, TestimonialView } from "@/lib/types";

function text(value: string | number | undefined): string { return typeof value === "string" ? value : ""; }

function paragraphs(value: string, className?: string): ReactNode {
  return value.split(/\r?\n\s*\r?\n/).filter(Boolean).map((paragraph, index) => <p className={className} key={`${paragraph}-${index}`}>{paragraph}</p>);
}

function safeHref(value: string): string {
  if (value.startsWith("/") || /^https?:\/\//i.test(value)) return value;
  return "#";
}

function safeImageSrc(value: string): string {
  if (value.startsWith("/") || /^https:\/\//i.test(value)) return value;
  return "";
}

function safeCustomCss(value: string): string {
  return value.trim().slice(0, 6_000).replace(/<\/?style\b[^>]*>/gi, "").replace(/@import\s+[^;]+;?/gi, "").replace(/(?:expression|javascript)\s*:/gi, "");
}

function scopedCustomCss(value: string, selector: string): string {
  const css = safeCustomCss(value);
  if (!css) return "";
  return css.replace(/(^|})\s*([^@{}][^{}]*)\{/g, (_match, prefix: string, selectors: string) => {
    const scoped = selectors.split(",").map((item) => `${selector} ${item.trim()}`).join(", ");
    return `${prefix}\n${scoped} {`;
  });
}

type BlockVisibility = "all" | "desktop" | "tablet" | "mobile";

function safeBlockId(value: string): string | undefined {
  return /^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(value) ? value : undefined;
}

function blockVisibility(value: string): BlockVisibility {
  return ["desktop", "tablet", "mobile"].includes(value) ? value as Exclude<BlockVisibility, "all"> : "all";
}

function titleTag(value: string): "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "div" | "span" | "p" {
  return ["h1", "h2", "h3", "h4", "h5", "h6", "div", "span", "p"].includes(value) ? value as ReturnType<typeof titleTag> : "h3";
}

function DynamicTitle({ tag, children }: { tag: ReturnType<typeof titleTag>; children: ReactNode }) {
  return createElement(tag, null, children);
}

function styledProps(block: PageBlock, extra: CSSProperties = {}): { style: CSSProperties; "data-block-style"?: "true"; id?: string; role?: string; title?: string; "aria-label"?: string; "data-block-visibility"?: Exclude<BlockVisibility, "all">; "data-block-hidden-devices"?: string; "data-page-block-scope"?: string } {
  const css = { ...pageBlockStyleToCss(block.style), ...extra } as CSSProperties;
  const id = safeBlockId(text(block.data.cssId));
  const visibility = blockVisibility(text(block.data.visibility));
  const role = new Set(["article", "complementary", "main", "navigation", "region", "section"]).has(text(block.data.role)) ? text(block.data.role) : undefined;
  const ariaLabel = text(block.data.ariaLabel).trim().slice(0, 160) || undefined;
  const title = text(block.data.titleAttribute).trim().slice(0, 160) || undefined;
  const hiddenDevices = text(block.data.hiddenDevices).split(",").map((value) => value.trim()).filter((value) => /^[a-z]+(?:[A-Z][a-z]+)*$/.test(value)).join(" ");
  const hasCustomCss = Boolean(safeCustomCss(text(block.data.customCss)));
  return {
    style: css,
    ...(Object.keys(css).length > 0 ? { "data-block-style": "true" as const } : {}),
    ...(id ? { id } : {}),
    ...(role ? { role } : {}),
    ...(title ? { title } : {}),
    ...(ariaLabel ? { "aria-label": ariaLabel } : {}),
    ...(visibility !== "all" ? { "data-block-visibility": visibility } : {}),
    ...(hiddenDevices ? { "data-block-hidden-devices": hiddenDevices } : {}),
    ...(hasCustomCss ? { "data-page-block-scope": block.id } : {}),
  };
}

function ActionLink({ href, label, className = "", id, children }: { href: string; label: string; className?: string; id?: string; children?: ReactNode }) {
  const target = safeHref(href);
  const content = children ?? label;
  return target.startsWith("/") ? <Link className={`button ${className}`.trim()} href={target} id={id}>{content}</Link> : <a className={`button ${className}`.trim()} href={target} id={id} rel="noreferrer">{content}</a>;
}

function CatalogBlock({ block, products, filterCategory, productPage }: { block: PageBlock; products: ProductListItem[]; filterCategory: string; productPage: number }) {
  const data = block.data;
  const heading = text(data.heading) || (block.type === "product_category" ? text(data.category) || "Shop the collection" : "Featured products");
  const category = text(data.category);
  const columns = Math.min(6, Math.max(1, Number(data.columns) || 3));
  const itemsPerPage = Math.min(48, Math.max(1, Number(data.itemsPerPage ?? data.maxItems) || 6));
  const pagination = text(data.pagination) === "none" ? "none" : "numbers";
  const sort = text(data.sort) || "name-asc";
  const cardOptions: ProductCardOptions = {
    showImage: text(data.showImage) !== "no",
    showSku: text(data.showSku) !== "no",
    showDescription: text(data.showDescription) !== "no",
    showPrice: text(data.showPrice) !== "no",
    showInventory: text(data.showInventory) !== "no",
    showButton: text(data.showButton) !== "no",
    buttonLabel: text(data.buttonLabel) || "View product",
    cardStyle: text(data.cardStyle) === "minimal" ? "minimal" : "card",
  };
  const filtered = products.filter((product) => (block.type === "sale_grid" ? product.salePriceCents !== null : true) && (!category || product.category.toLowerCase() === category.toLowerCase()));
  const sorted = [...filtered].sort((left, right) => {
    if (sort === "price-asc") return left.priceCents - right.priceCents || left.name.localeCompare(right.name);
    if (sort === "price-desc") return right.priceCents - left.priceCents || left.name.localeCompare(right.name);
    if (sort === "name-desc") return right.name.localeCompare(left.name);
    return left.name.localeCompare(right.name);
  });
  const totalPages = pagination === "none" ? 1 : Math.max(1, Math.ceil(sorted.length / itemsPerPage));
  const currentPage = Math.min(totalPages, Math.max(1, productPage));
  const visible = pagination === "none" ? sorted.slice(0, itemsPerPage) : sorted.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const pageHref = (page: number) => {
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (page > 1) params.set("product_page", String(page));
    const query = params.toString();
    return `/products${query ? `?${query}` : ""}`;
  };
  return <section className="content-block content-block-products" {...styledProps(block)}><div className="content-block-section-heading"><div><span className="eyebrow">Physical goods</span><h2>{heading}</h2></div>{category ? <Link className="panel-link" href={`/products?category=${encodeURIComponent(category)}`}>View collection</Link> : filterCategory ? <div className="catalog-toolbar"><span className="category-chip active">Category: {filterCategory}</span><Link className="panel-link" href="/products">Clear category</Link></div> : null}</div>{visible.length > 0 ? <div className="product-grid" data-card-style={cardOptions.cardStyle} style={{ "--product-columns": columns } as React.CSSProperties}>{visible.map((product) => <ProductCard key={product.id} product={product} options={cardOptions} />)}</div> : <p className="muted">No products are available in this collection yet.</p>}{pagination !== "none" && totalPages > 1 ? <nav className="product-pagination" aria-label={`${heading} pages`}><Link className={currentPage === 1 ? "is-disabled" : ""} aria-disabled={currentPage === 1} href={currentPage === 1 ? pageHref(1) : pageHref(currentPage - 1)}>Previous</Link><span>Page {currentPage} of {totalPages}</span><Link className={currentPage === totalPages ? "is-disabled" : ""} aria-disabled={currentPage === totalPages} href={currentPage === totalPages ? pageHref(totalPages) : pageHref(currentPage + 1)}>Next</Link></nav> : null}</section>;
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

function HeadingBlock({ block }: { block: PageBlock }) {
  const data = block.data;
  const tag = titleTag(text(data.tag) || "h2");
  const alignment = new Set(["left", "center", "right", "justify"]).has(text(data.alignment)) ? text(data.alignment) as CSSProperties["textAlign"] : undefined;
  const heading = <DynamicTitle tag={tag}>{text(data.text) || "Add a heading"}</DynamicTitle>;
  const href = text(data.link);
  const customAttributes = safeLinkAttributes(data.linkAttributes);
  const linkProps = text(data.linkTarget) === "new" ? { target: "_blank", rel: text(data.linkNofollow) === "yes" ? "noreferrer nofollow" : "noreferrer", ...customAttributes } : { rel: text(data.linkNofollow) === "yes" ? "nofollow" : undefined, ...customAttributes };
  const linked = href ? (safeHref(href).startsWith("/") ? <Link href={safeHref(href)} {...linkProps}>{heading}</Link> : <a href={safeHref(href)} {...linkProps}>{heading}</a>) : heading;
  return <section className="content-block content-block-heading" {...styledProps(block, { textAlign: alignment })}>{linked}</section>;
}

function videoEmbedUrl(source: string, value: string, start: number, end: number, privacy: boolean, suggestedVideos = false, captions = false): string {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    const query = new URLSearchParams();
    if (start > 0) query.set("start", String(Math.round(start)));
    if (end > start) query.set("end", String(Math.round(end)));
    if (source === "youtube" && (host === "youtube.com" || host === "youtu.be" || host === "youtube-nocookie.com")) {
      const id = host === "youtu.be" ? url.pathname.slice(1) : url.searchParams.get("v") || url.pathname.split("/").filter(Boolean).pop() || "";
      if (!/^[A-Za-z0-9_-]{6,}$/.test(id)) return "";
      query.set("rel", suggestedVideos ? "1" : "0");
      if (captions) query.set("cc_load_policy", "1");
      return `https://${privacy ? "www.youtube-nocookie.com" : "www.youtube.com"}/embed/${id}?${query.toString()}`;
    }
    if (source === "vimeo" && (host === "vimeo.com" || host === "player.vimeo.com")) {
      const id = url.pathname.split("/").filter(Boolean).pop() || "";
      if (!/^\d{4,}$/.test(id)) return "";
      return `https://player.vimeo.com/video/${id}${query.toString() ? `?${query.toString()}` : ""}`;
    }
  } catch { return ""; }
  return "";
}

function VideoBlock({ block }: { block: PageBlock }) {
  const data = block.data;
  const source = new Set(["youtube", "vimeo", "file"]).has(text(data.source)) ? text(data.source) : "youtube";
  const url = text(data.url);
  const start = Math.max(0, Number(data.start) || 0);
  const end = Math.max(0, Number(data.end) || 0);
  const captions = text(data.captions) === "yes";
  const suggestedVideos = text(data.suggestedVideos) === "yes";
  const embed = source === "file" ? "" : videoEmbedUrl(source, url, start, end, text(data.privacy) !== "no", suggestedVideos, captions);
  const file = source === "file" && safeImageSrc(url) ? url : "";
  const poster = safeImageSrc(text(data.overlayImage));
  const captionsUrl = safeImageSrc(text(data.captionsUrl));
  const params = new URLSearchParams();
  if (text(data.mute) === "yes") params.set("mute", "1");
  if (text(data.loop) === "yes") params.set("loop", "1");
  if (text(data.controls) === "no") params.set("controls", "0");
  const passiveSrc = embed ? `${embed}${embed.includes("?") ? "&" : "?"}${params.toString()}` : "";
  const playParams = new URLSearchParams(params);
  playParams.set("autoplay", "1");
  const playingSrc = embed ? `${embed}${embed.includes("?") ? "&" : "?"}${playParams.toString()}` : "";
  return <section className="content-block content-block-video" {...styledProps(block)}><VideoBlockClient embedSrc={passiveSrc} embedPlaySrc={playingSrc} file={file} poster={poster} alt={text(data.overlayAlt) || "Video preview"} showOverlay={text(data.overlay) === "show"} showPlayIcon={text(data.overlayPlayIcon) !== "no"} lightbox={text(data.overlayLightbox) === "yes"} autoplay={text(data.autoplay) === "yes"} mute={text(data.mute) === "yes"} loop={text(data.loop) === "yes"} controls={text(data.controls) !== "no"} lazy={text(data.lazy) !== "no"} captions={captions} captionsUrl={captionsUrl} /></section>;
}

function backgroundLayerForBlock(block: PageBlock): ReactNode | null {
  const background = block.style?.background;
  if (!background || background.mode === "none") return null;
  if (background.mode === "video") {
    const source = background.videoSource ?? "file";
    const url = safeImageSrc(background.videoUrl ?? "");
    const embed = source === "file" ? "" : videoEmbedUrl(source, url, background.videoStart ?? 0, background.videoEnd ?? 0, true);
    return <BackgroundLayer mode="video" videoUrl={source === "file" ? url : ""} videoEmbed={embed} fallbackImage={safeImageSrc(background.videoFallbackImage ?? "")} />;
  }
  if (background.mode === "slideshow") return <BackgroundLayer mode="slideshow" images={(background.slideshowImages ?? []).map((image) => safeImageSrc(image)).filter(Boolean)} infinite={background.slideshowInfinite ?? true} duration={background.slideshowDuration} transition={background.slideshowTransition} transitionDuration={background.slideshowTransitionDuration} lazyLoad={background.slideshowLazyLoad} kenBurns={background.slideshowKenBurns} />;
  return null;
}

function NavigationBlock({ block, navigationMenus, isAuthenticated, templateKind }: { block: PageBlock; navigationMenus: NavigationMenuView[]; isAuthenticated: boolean; templateKind?: SiteTemplateKind }) {
  const menu = navigationMenus.find((candidate) => candidate.id === text(block.data.menuId));
  const items = menu?.items.filter((item) => item.isVisible) ?? [];
  const layout = text(block.data.layout) === "stacked" ? "content-block-menu-stacked" : "content-block-menu-horizontal";
  if (templateKind) return <PublicNavigation items={items} ariaLabel={menu?.name || (templateKind === "header" ? "Primary navigation" : "Footer navigation")} className={`${layout} content-block-template-navigation`} isAuthenticated={isAuthenticated} />;
  return <section className="content-block content-block-navigation" {...styledProps(block)}><div className="content-block-section-heading"><div><span className="eyebrow">Navigation</span><h2>{text(block.data.heading) || menu?.name || "Explore more"}</h2></div>{menu ? <span className="row-meta">{menu.name}</span> : null}</div>{menu && items.length > 0 ? <PublicNavigation items={items} ariaLabel={menu.name} className={layout} isAuthenticated={isAuthenticated} /> : <p className="muted">Choose a saved menu in the block settings.</p>}</section>;
}

function HtmlBlock({ block }: { block: PageBlock }) {
  const html = sanitizeHtml(text(block.data.html));
  return <section className="content-block content-block-html" {...styledProps(block)}>{html ? <div dangerouslySetInnerHTML={{ __html: html }} /> : <p className="muted">Add HTML markup in the editor.</p>}</section>;
}

function FormBlock({ block, forms }: { block: PageBlock; forms: FormDefinition[] }) {
  const key = text(block.data.formSlug) || text(block.data.formId);
  const form = forms.find((candidate) => candidate.slug === key || candidate.id === key);
  return form ? <section className="content-block content-block-form" {...styledProps(block)}><FormRenderer form={form} /></section> : <section className="content-block content-block-form" {...styledProps(block)}><div className="content-form-placeholder"><span className="eyebrow">Reusable form</span><h2>{text(block.data.heading) || "Choose a form"}</h2><p className="muted">Select a published form in the page editor to render it here.</p></div></section>;
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

const fontAwesomeIconSets: Record<string, Record<string, IconDefinition>> = {
  "fontawesome-regular": { star: faStarRegular, heart: faHeartRegular, check: faCircleCheckRegular, calendar: faCalendarRegular },
  "fontawesome-solid": { star: faStarSolid, heart: faHeartSolid, shield: faShieldHalved, check: faCircleCheck, sparkles: faWandMagicSparkles, calendar: faCalendarSolid, video: faVideoSolid, gift: faGiftSolid, users: faUsersSolid, trophy: faTrophySolid },
  "fontawesome-brands": { facebook: faFacebook, instagram: faInstagram, youtube: faYoutube, linkedin: faLinkedin },
};

function IconGlyph({ name, source, url }: { name: string; source: string; url: string }) {
  const src = safeImageSrc(url);
  if (src) return <img className="icon-box-custom-icon" src={src} alt="" aria-hidden="true" />;
  const fontAwesomeIcon = fontAwesomeIconSets[source]?.[name];
  if (fontAwesomeIcon) return <FontAwesomeIcon icon={fontAwesomeIcon} aria-hidden="true" />;
  const Icon = iconComponents[name] ?? Star;
  return <Icon size={28} strokeWidth={1.8} aria-hidden={true} />;
}

function IconBoxBlock({ block }: { block: PageBlock }) {
  const data = block.data;
  const target = safeHref(text(data.link));
  const view = new Set(["default", "stacked", "framed"]).has(text(data.iconView)) ? text(data.iconView) : "framed";
  const content = <><div className={`icon-box-icon icon-box-icon-${view}`}><IconGlyph name={text(data.iconName)} source={text(data.iconSource) || "fontawesome-solid"} url={text(data.iconUrl)} /></div><div className="icon-box-copy">{text(data.title) ? <DynamicTitle tag={titleTag(text(data.titleTag))}>{text(data.title)}</DynamicTitle> : null}{text(data.description) ? <div>{paragraphs(text(data.description))}</div> : null}</div></>;
  const body = text(data.link) && target !== "#" ? target.startsWith("/") ? <Link href={target}>{content}</Link> : <a href={target} rel="noreferrer">{content}</a> : content;
  return <article className={`content-block content-block-icon-box icon-box-view-${view}`} {...styledProps(block)}>{body}</article>;
}

function IconBlock({ block }: { block: PageBlock }) {
  const data = block.data;
  const target = safeHref(text(data.link));
  const view = new Set(["default", "stacked", "framed"]).has(text(data.iconView)) ? text(data.iconView) : "default";
  const icon = <span className={`content-icon-glyph content-icon-glyph-${view}`}><IconGlyph name={text(data.iconName) || "sparkles"} source={text(data.iconSource) || "fontawesome-solid"} url={text(data.iconUrl)} /></span>;
  const linkProps = text(data.linkTarget) === "new" ? { target: "_blank", rel: text(data.linkNofollow) === "yes" ? "noreferrer nofollow" : "noreferrer" } : { rel: text(data.linkNofollow) === "yes" ? "nofollow" : undefined };
  const body = text(data.link) && target !== "#" ? target.startsWith("/") ? <Link href={target} {...linkProps}>{icon}</Link> : <a href={target} {...linkProps}>{icon}</a> : icon;
  return <div className={`content-block content-block-icon icon-view-${view}`} {...styledProps(block)}>{body}</div>;
}

function CtaBlock({ block }: { block: PageBlock }) {
  const data = block.data;
  const graphicType = new Set(["none", "image", "icon"]).has(text(data.graphicType)) ? text(data.graphicType) : "none";
  let graphic: ReactNode = null;
  if (graphicType === "image" && safeImageSrc(text(data.graphicImage))) graphic = <img className="content-cta-graphic-image" src={safeImageSrc(text(data.graphicImage))} alt="" loading="lazy" />;
  if (graphicType === "icon") graphic = <span className="content-cta-graphic-icon"><IconGlyph name={text(data.graphicIcon) || "sparkles"} source="fontawesome-solid" url="" /></span>;
  const headingTag = titleTag(text(data.titleTag) || "h2");
  const descriptionTag = new Set(["p", "div", "span"]).has(text(data.descriptionTag)) ? text(data.descriptionTag) as "p" | "div" | "span" : "p";
  const heading = <DynamicTitle tag={headingTag}>{text(data.heading) || "Ready for the next step?"}</DynamicTitle>;
  const body = text(data.body) ? descriptionTag === "p" ? paragraphs(text(data.body), "content-cta-description") : createElement(descriptionTag, { className: "content-cta-description" }, text(data.body)) : null;
  const href = safeHref(text(data.buttonHref));
  const linkProps = text(data.buttonTarget) === "new" ? { target: "_blank", rel: text(data.buttonNofollow) === "yes" ? "noreferrer nofollow" : "noreferrer" } : { rel: text(data.buttonNofollow) === "yes" ? "nofollow" : undefined };
  const button = text(data.buttonLabel) ? href.startsWith("/") ? <Link className="button" href={href} {...linkProps}>{text(data.buttonLabel)}</Link> : <a className="button" href={href} {...linkProps}>{text(data.buttonLabel)}</a> : null;
  return <section className="content-block content-block-cta" {...styledProps(block)}>{graphic ? <div className="content-cta-graphic">{graphic}</div> : null}<div className="content-cta-copy"><span className="eyebrow">{text(data.ribbonText) || "Next step"}</span>{heading}{body}</div>{button ? <div className="content-cta-action">{button}</div> : null}</section>;
}

function MapBlock({ block }: { block: PageBlock }) {
  const resolved = normalizeMapLocation(block.data);
  const location = resolved?.label ?? "";
  const zoom = Math.min(20, Math.max(1, Number(block.data.zoom) || 10));
  const height = Math.min(1_200, Math.max(160, Number(block.data.height) || 360));
  const query = encodeURIComponent(resolved?.query ?? "");
  const embedUrl = location ? `https://www.google.com/maps?q=${query}&z=${zoom}&output=embed` : "";
  const mapLink = location ? `https://www.google.com/maps/search/?api=1&query=${query}` : "";
  const showPlaceCard = text(block.data.showPlaceCard) === "yes";
  const placeQuery = text(block.data.placeQuery) || location;
  return <section className="content-block content-block-map" {...styledProps(block, { height: `${height}px`, minHeight: `${height}px` })}>{embedUrl ? <iframe title={`Map of ${location}`} src={embedUrl} loading="lazy" referrerPolicy="no-referrer-when-downgrade" /> : <div className="content-map-placeholder">Add an address or valid coordinates in the editor to show a map.</div>}{showPlaceCard && placeQuery ? <MapPlaceCard key={placeQuery} query={placeQuery} /> : null}{mapLink ? <a className="content-map-link" href={mapLink} target="_blank" rel="noreferrer">Open in Google Maps</a> : null}</section>;
}

function LocationIndexBlock({ block, locations }: { block: PageBlock; locations: ServiceLocation[] }) {
  return <section className="content-block content-block-location-index" {...styledProps(block)}>
    <div className="notice-banner location-note"><MapPin size={17} /><span><strong>Sample service coverage.</strong> These pages describe virtual-first delivery examples. They do not claim a physical office, local address, review history, or imported customer relationship.</span></div>
    <div className="content-block-section-heading"><div><span className="eyebrow">Coverage directory</span><h2>{text(block.data.heading) || "Sample service locations"}</h2></div><span className="row-meta">{locations.length} sample areas</span></div>
    <div className="location-index-grid" aria-label="Sample service locations">
      {locations.map((location) => <article className={`location-index-card ${location.accent}`} key={location.slug}>
        <div className="location-card-topline"><span className="location-icon"><MapPin size={16} /></span><span className="eyebrow">{location.timezone}</span></div>
        <h3>{location.title}</h3>
        <p>{location.summary}</p>
        <div className="location-card-meta"><span><Video size={13} /> {location.deliveryModes[0]}</span><span><CalendarDays size={13} /> {location.bestFor.length} use cases</span></div>
        <Link className="button button-small" href={`/locations/${location.slug}`}>Explore coverage <ArrowUpRight size={14} /></Link>
      </article>)}
    </div>
  </section>;
}

function LocationDetailBlock({ block, locations }: { block: PageBlock; locations: ServiceLocation[] }) {
  const location = locations.find((candidate) => candidate.slug === text(block.data.locationSlug));
  if (!location) return <section className="content-block content-block-location-detail" {...styledProps(block)}><div className="content-form-placeholder"><span className="eyebrow">Service location template</span><h2>Choose a managed service location</h2><p className="muted">Select a location in the page editor to render its reusable detail template.</p></div></section>;
  return <section className="content-block content-block-location-detail" {...styledProps(block)}><LocationDetailTemplate location={location} otherLocations={locations.filter((candidate) => candidate.slug !== location.slug)} /></section>;
}

function ContainerBlock({ block, products, testimonials, navigationMenus, forms, filterCategory, productPage, locations, editorMode, isAuthenticated, depth, templateKind }: { block: PageBlock; products: ProductListItem[]; testimonials: TestimonialView[]; navigationMenus: NavigationMenuView[]; forms: FormDefinition[]; filterCategory: string; productPage: number; locations: ServiceLocation[]; editorMode: boolean; isAuthenticated: boolean; depth: number; templateKind?: SiteTemplateKind }) {
  const css = { ...pageBlockStyleToCss(block.style), ...pageBlockLayoutToCss(block.layout) };
  const props = styledProps(block, css as CSSProperties);
  const tag = new Set(["div", "header", "footer", "main", "article", "section", "aside", "nav", "a"]).has(text(block.layout?.htmlTag)) ? text(block.layout?.htmlTag) : "section";
  const linkProps = tag === "a" && text(block.layout?.linkUrl) ? { href: safeHref(text(block.layout?.linkUrl)), target: text(block.layout?.linkTarget) === "new" ? "_blank" : undefined, rel: text(block.layout?.linkTarget) === "new" ? "noreferrer" : undefined } : {};
  return createElement(tag, { className: "content-block content-block-container", ...props, ...linkProps }, <div className="content-block-container-inner">{editorMode && depth > 0 ? <button type="button" className="page-preview-container-focus-button" data-page-editor-focus-container={block.id} aria-label="Add a widget to this container" title="Add widget here"><Plus size={15} /><span>Add widget</span></button> : null}<PageRenderer blocks={block.children ?? []} products={products} testimonials={testimonials} navigationMenus={navigationMenus} forms={forms} filterCategory={filterCategory} productPage={productPage} locations={locations} className="content-page-renderer-nested" editorMode={editorMode} isAuthenticated={isAuthenticated} depth={depth + 1} templateKind={templateKind} /></div>);
}

export function PageRenderer({ blocks, products = [], testimonials = [], navigationMenus = [], forms = [], filterCategory = "", productPage = 1, locations = serviceLocations, className = "", editorMode = false, isAuthenticated = false, depth = 0, templateKind }: { blocks: PageBlock[]; products?: ProductListItem[]; testimonials?: TestimonialView[]; navigationMenus?: NavigationMenuView[]; forms?: FormDefinition[]; filterCategory?: string; productPage?: number; locations?: ServiceLocation[]; className?: string; editorMode?: boolean; isAuthenticated?: boolean; depth?: number; templateKind?: SiteTemplateKind }) {
  return <div className={`content-page-renderer ${className}`.trim()}>{Children.toArray(blocks.map((block) => {
    const data = block.data;
    let rendered: ReactNode;
    if (block.type === "container") rendered = <ContainerBlock block={block} products={products} testimonials={testimonials} navigationMenus={navigationMenus} forms={forms} filterCategory={filterCategory} productPage={productPage} locations={locations} editorMode={editorMode} isAuthenticated={isAuthenticated} depth={depth} templateKind={templateKind} />;
    else if (block.type === "hero") rendered = <section className="content-block content-block-hero" {...styledProps(block)}><span className="eyebrow">{text(data.eyebrow) || "Featured content"}</span><h1>{text(data.heading) || "A page built for your audience."}</h1>{text(data.body) ? <div className="content-block-copy">{paragraphs(text(data.body))}</div> : null}{text(data.ctaLabel) ? <ActionLink href={text(data.ctaHref)} label={text(data.ctaLabel)} /> : null}</section>;
    else if (block.type === "heading") rendered = <HeadingBlock block={block} />;
    else if (block.type === "rich_text") rendered = <RichTextBlock block={block} />;
    else if (block.type === "image") rendered = <figure className="content-block content-block-image" {...styledProps(block)}>{safeImageSrc(text(data.src)) ? <img src={safeImageSrc(text(data.src))} alt={text(data.alt)} loading="lazy" /> : <div className="content-image-placeholder">Add an image URL in the editor.</div>}{text(data.caption) ? <figcaption>{text(data.caption)}</figcaption> : null}</figure>;
    else if (block.type === "image_box") rendered = <ImageBoxBlock block={block} />;
    else if (block.type === "icon") rendered = <IconBlock block={block} />;
    else if (block.type === "icon_box") rendered = <IconBoxBlock block={block} />;
    else if (block.type === "video") rendered = <VideoBlock block={block} />;
    else if (block.type === "button") rendered = <ButtonBlock block={block} />;
    else if (block.type === "cta") rendered = <CtaBlock block={block} />;
    else if (block.type === "product_grid" || block.type === "product_category" || block.type === "sale_grid") rendered = <CatalogBlock block={block} products={products} filterCategory={filterCategory} productPage={productPage} />;
    else if (block.type === "gallery") rendered = <GalleryBlock block={block} />;
    else if (block.type === "testimonial_grid") rendered = <TestimonialBlock block={block} testimonials={testimonials} />;
    else if (block.type === "navigation_menu") rendered = <NavigationBlock block={block} navigationMenus={navigationMenus} isAuthenticated={isAuthenticated} templateKind={templateKind} />;
    else if (block.type === "html") rendered = <HtmlBlock block={block} />;
    else if (block.type === "form") rendered = <FormBlock block={block} forms={forms} />;
    else if (block.type === "location_index") rendered = <LocationIndexBlock block={block} locations={locations} />;
    else if (block.type === "location_detail") rendered = <LocationDetailBlock block={block} locations={locations} />;
    else if (block.type === "map") rendered = <MapBlock block={block} />;
    else rendered = <div className="content-block content-block-spacer" {...styledProps(block, { height: `${Math.min(240, Math.max(12, Number(data.height) || 48))}px` })} aria-hidden="true" />;
    const backgroundLayer = backgroundLayerForBlock(block);
    const withBackground = backgroundLayer && isValidElement(rendered) ? (() => {
      const element = rendered as ReactElement<{ className?: string; children?: ReactNode }>;
      return cloneElement(element, { className: `${element.props.className ?? ""} content-block-has-background-layer`.trim(), children: <>{backgroundLayer}{element.props.children}</> });
    })() : rendered;
    const customCss = scopedCustomCss(text(block.data.customCss), `[data-page-block-scope="${block.id}"]`);
    const withCustomCss = customCss ? <>{withBackground}<style>{customCss}</style></> : withBackground;
    return editorMode ? <div key={block.id} className="page-renderer-block-editor-frame" data-page-block-id={block.id} data-page-block-type={block.type}>{withCustomCss}</div> : <Fragment key={block.id}>{withCustomCss}</Fragment>;
  }))}</div>;
}
