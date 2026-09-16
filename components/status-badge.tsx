import type { WebinarStatus } from "@/lib/types";

const labels: Record<WebinarStatus | "active" | "sent" | "queued", string> = {
  draft: "Draft",
  published: "Published",
  sold_out: "Sold out",
  completed: "Completed",
  active: "Active",
  sent: "Sent",
  queued: "Queued",
};

export function StatusBadge({ status }: { status: WebinarStatus | "active" | "sent" | "queued" }) {
  return <span className={`status-badge status-${status.replace("_", "-")}`}><span className="status-dot" />{labels[status]}</span>;
}
