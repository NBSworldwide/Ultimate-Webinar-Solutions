import type { WebinarStatus } from "@/lib/types";

const labels: Record<WebinarStatus | "active" | "sent" | "queued" | "free", string> = {
  draft: "Draft",
  published: "Published",
  sold_out: "Sold out",
  completed: "Completed",
  active: "Active",
  sent: "Sent",
  queued: "Queued",
  free: "Free",
};

export function StatusBadge({ status }: { status: WebinarStatus | "active" | "sent" | "queued" | "free" }) {
  return <span className={`status-badge status-${status.replace("_", "-")}`}><span className="status-dot" />{labels[status]}</span>;
}
