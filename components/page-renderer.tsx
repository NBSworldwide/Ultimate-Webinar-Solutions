import Link from "next/link";
import type { PageBlock, ProductListItem, TestimonialView } from "@/lib/types";
import { formatMoney } from "@/lib/format";

function text(value: string | number | undefined): string { return typeof value === "string" ? value : ""; }

function paragraphs(value: string): React.ReactNode {
  return value.split(/\r?\n\s*\r?\n/).filter(Boolean).map((paragraph, index) => <p key={`${paragraph}-${index}`}>{paragraph}</p>);
}

function safeHref(value: string): string {
  if (value.startsWith("/") || /^https?:\/\//i.test(value)) return value;
  return "#";
}

function ActionLink({ href, label }: { href: string; label: string }) {
  const target = safeHref(href);
  return target.startsWith("/") ? <Link className="button" href={target}>{label}</Link> : <a className="button" href={target} rel="noreferrer">{label}</a>;
}

function CatalogBlock({ block, products }: { block: PageBlock; products: ProductListItem[] }) {
  const data = block.data;
  const heading = text(data.heading) || (block.type === "product_category" ? text(data.category) || "Shop the collection" : "Featured products");
  const category = text(data.category);
  const maxItems = Math.min(12, Math.max(1, Number(data.maxItems) || 6));
  const visible = products.filter((product) => (block.type === "sale_grid" ? product.salePriceCents !== null : true) && (!category || product.category.toLowerCase() === category.toLowerCase())).slice(0, maxItems);
  return <section className="content-block content-block-products" key={block.id}><div className="content-block-section-heading"><div><span className="eyebrow">Physical goods</span><h2>{heading}</h2></div>{category ? <Link className="panel-link" href={`/products?category=${encodeURIComponent(category)}`}>View collection</Link> : null}</div>{visible.length > 0 ? <div className="product-grid">{visible.map((product) => <article className="product-card" key={product.id}><div className="product-art" aria-hidden="true"><span>{product.category}</span></div><div className="product-card-copy"><span className="eyebrow">{product.sku}</span><h3>{product.name}</h3><p>{product.description}</p><div className="product-card-footer"><strong>{formatMoney(product.priceCents)}</strong><Link href={`/products/${product.slug}`} className="button button-small">View product</Link></div></div></article>)}</div> : <p className="muted">No products are available in this collection yet.</p>}</section>;
}

function GalleryBlock({ block }: { block: PageBlock }) {
  const images = text(block.data.images).split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => {
    const [src, alt = "Gallery image", caption = ""] = line.split("|").map((value) => value.trim());
    return { src, alt, caption };
  }).filter((image) => /^https?:\/\//i.test(image.src));
  return <section className="content-block content-block-gallery" key={block.id}><h2>{text(block.data.heading) || "Photo gallery"}</h2>{images.length > 0 ? <div className="photo-gallery">{images.map((image) => <figure key={`${image.src}-${image.alt}`}><img src={image.src} alt={image.alt} loading="lazy" />{image.caption ? <figcaption>{image.caption}</figcaption> : null}</figure>)}</div> : <p className="muted">Add one image per line in the gallery block.</p>}</section>;
}

function TestimonialBlock({ block, testimonials }: { block: PageBlock; testimonials: TestimonialView[] }) {
  const visible = testimonials.slice(0, Math.min(12, Math.max(1, Number(block.data.maxItems) || 6)));
  return <section className="content-block content-block-testimonials" key={block.id}><span className="eyebrow">Verified customers</span><h2>{text(block.data.heading) || "What customers are saying"}</h2>{visible.length > 0 ? <div className="testimonial-grid">{visible.map((testimonial) => <figure key={testimonial.id}><div aria-label={`${testimonial.rating} out of 5 stars`}>{"★".repeat(testimonial.rating)}{"☆".repeat(5 - testimonial.rating)}</div><blockquote>“{testimonial.quote}”</blockquote><figcaption><strong>{testimonial.customerName}</strong>{testimonial.productName ? <span>{testimonial.productName}</span> : null}</figcaption></figure>)}</div> : <p className="muted">Approved testimonials will appear here after review.</p>}</section>;
}

export function PageRenderer({ blocks, products = [], testimonials = [] }: { blocks: PageBlock[]; products?: ProductListItem[]; testimonials?: TestimonialView[] }) {
  return <div className="content-page-renderer">{blocks.map((block) => {
    const data = block.data;
    if (block.type === "hero") return <section className="content-block content-block-hero" key={block.id}><span className="eyebrow">{text(data.eyebrow) || "Featured content"}</span><h1>{text(data.heading) || "A page built for your audience."}</h1>{text(data.body) ? <div className="content-block-copy">{paragraphs(text(data.body))}</div> : null}{text(data.ctaLabel) ? <ActionLink href={text(data.ctaHref)} label={text(data.ctaLabel)} /> : null}</section>;
    if (block.type === "rich_text") return <section className="content-block content-block-rich-text" key={block.id}>{text(data.heading) ? <h2>{text(data.heading)}</h2> : null}{paragraphs(text(data.body))}</section>;
    if (block.type === "image") return <figure className="content-block content-block-image" key={block.id}>{text(data.src) ? <img src={text(data.src)} alt={text(data.alt)} loading="lazy" /> : <div className="content-image-placeholder">Add an image URL in the editor.</div>}{text(data.caption) ? <figcaption>{text(data.caption)}</figcaption> : null}</figure>;
    if (block.type === "cta") return <section className="content-block content-block-cta" key={block.id}><div><span className="eyebrow">Next step</span><h2>{text(data.heading) || "Keep the conversation moving."}</h2>{text(data.body) ? <div className="content-block-copy">{paragraphs(text(data.body))}</div> : null}</div>{text(data.buttonLabel) ? <ActionLink href={text(data.buttonHref)} label={text(data.buttonLabel)} /> : null}</section>;
    if (block.type === "product_grid" || block.type === "product_category" || block.type === "sale_grid") return <CatalogBlock key={block.id} block={block} products={products} />;
    if (block.type === "gallery") return <GalleryBlock key={block.id} block={block} />;
    if (block.type === "testimonial_grid") return <TestimonialBlock key={block.id} block={block} testimonials={testimonials} />;
    return <div className="content-block content-block-spacer" style={{ height: `${Math.min(240, Math.max(12, Number(data.height) || 48))}px` }} aria-hidden="true" key={block.id} />;
  })}</div>;
}
