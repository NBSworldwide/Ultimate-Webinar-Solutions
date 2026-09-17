import Link from "next/link";
import { ArrowRight, Copy, Layers3, Sparkles } from "lucide-react";
import { CostCalculator } from "@/components/cost-calculator";
import { webinarTemplates } from "@/lib/playbooks";
import { formatMoney } from "@/lib/format";

export default function PlaybooksPage() {
  return <div className="content-width"><div className="page-topline"><div><span className="eyebrow">Repeatable operations</span><h1 className="page-title">Playbooks</h1><p className="page-subtitle">Save the shape of a great session, then reuse it when the next idea is ready.</p></div><Link href="/admin/webinars/new" className="button"><Sparkles size={15} /> Start from a playbook</Link></div><section className="panel"><div className="panel-header"><div><h2 className="panel-title">Webinar templates</h2><span className="row-meta">Synthetic starter library</span></div><Layers3 size={17} color="#8b9995" /></div><div className="template-grid">{webinarTemplates.map((template) => <article className="template-card" key={template.id}><div className={`template-accent ${template.accent}`} /><span className="eyebrow">{template.format}</span><h3>{template.name}</h3><p>{template.description}</p><div className="template-meta"><span>{template.durationMinutes} min</span><span>{template.capacity} seats</span><strong>{formatMoney(template.startingPriceCents)}</strong></div><Link href={`/admin/webinars/new?template=${encodeURIComponent(template.id)}`} className="button button-secondary button-small"><Copy size={13} /> Use template <ArrowRight size={13} /></Link></article>)}</div></section><div className="section-spacer"><CostCalculator /></div></div>;
}
