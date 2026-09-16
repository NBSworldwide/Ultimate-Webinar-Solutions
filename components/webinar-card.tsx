import Link from "next/link";
import { ArrowUpRight, CalendarDays, Clock3 } from "lucide-react";
import { formatDate } from "@/lib/format";
import type { PublicWebinarListItem } from "@/lib/types";

export function WebinarCard({ webinar }: { webinar: PublicWebinarListItem }) {
  const tone = webinar.accent === "coral" ? "coral" : webinar.accent === "gold" ? "gold" : "";
  return (
    <article className="public-card">
      <div className={`card-accent ${tone}`} />
      <span className="eyebrow">{webinar.eyebrow}</span>
      <h2>{webinar.title}</h2>
      <p>{webinar.description}</p>
      <div className="public-card-footer">
        <div className="public-card-meta"><span><CalendarDays size={12} />{formatDate(webinar.startsAt, webinar.timezone)}</span><span><Clock3 size={12} />{webinar.durationMinutes} min</span></div>
        <Link href={`/webinars/${webinar.slug}`} className="button button-small">View session <ArrowUpRight size={14} /></Link>
      </div>
    </article>
  );
}
