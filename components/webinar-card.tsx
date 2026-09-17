import Link from "next/link";
import { ArrowUpRight, CalendarDays, Clock3, Ticket } from "lucide-react";
import { formatDate, formatMoney } from "@/lib/format";
import type { PublicWebinarListItem } from "@/lib/types";

export function WebinarCard({ webinar }: { webinar: PublicWebinarListItem }) {
  const tone = webinar.accent === "coral" ? "coral" : webinar.accent === "gold" ? "gold" : "";
  const ended = webinar.status === "completed";
  const soldOut = !ended && (webinar.status === "sold_out" || webinar.available <= 0);
  const availability = ended
    ? "Session ended"
    : soldOut
      ? `Sold out · ${webinar.sold}/${webinar.capacity}`
      : webinar.available <= 2
        ? `Only ${webinar.available} left · ${webinar.sold}/${webinar.capacity}`
        : `${webinar.available} seats available · ${webinar.sold}/${webinar.capacity}`;
  return (
    <article className="public-card">
      <div className={`card-accent ${tone}`} />
      <span className="eyebrow">{webinar.eyebrow}</span>
      <h2>{webinar.title}</h2>
      <p>{webinar.description}</p>
      <div className="webinar-card-status"><span className={soldOut ? "status-sold-out" : ended ? "status-ended" : "status-available"}><Ticket size={13} />{availability}</span><strong>{webinar.priceCents === 0 ? "Free" : `From ${formatMoney(webinar.priceCents)}`}</strong></div>
      <div className="public-card-footer">
        <div className="public-card-meta"><span><CalendarDays size={12} />{formatDate(webinar.startsAt, webinar.timezone)}</span><span><Clock3 size={12} />{webinar.durationMinutes} min</span></div>
        {soldOut ? <button className="button button-small button-disabled" type="button" disabled>Seats closed</button> : <Link href={`/webinars/${webinar.slug}`} className="button button-small">{ended ? (webinar.replayUrl ? "View replay" : "View session") : "Claim your seat"} <ArrowUpRight size={14} /></Link>}
      </div>
    </article>
  );
}
