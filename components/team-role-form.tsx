"use client";

import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Role } from "@/lib/types";

export function TeamRoleForm({ userId, role, disabled = false, canManageRoles, canRequestPromotion, promotionPending = false }: { userId: string; role: Role; disabled?: boolean; canManageRoles: boolean; canRequestPromotion: boolean; promotionPending?: boolean }) {
  const router = useRouter();
  const [value, setValue] = useState<Role>(role);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/team/${encodeURIComponent(userId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: value }),
      });
      const data = await response.json() as { error?: string; request?: { id: string } };
      if (!response.ok) throw new Error(data.error ?? "The account role could not be updated.");
      setMessage(data.request ? "Approval request sent" : "Saved");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The account role could not be updated.");
    } finally {
      setSaving(false);
    }
  }

  const canEdit = !disabled && (canManageRoles || (canRequestPromotion && role === "attendee"));
  const options = canManageRoles ? ["admin", "manager", "attendee"] as const : role === "attendee" ? ["attendee", "manager"] as const : [role];
  return <form className="team-role-form" onSubmit={submit}><label className="sr-only" htmlFor={`team-role-${userId}`}>Account role</label>{promotionPending ? <span className="status-badge status-queued"><span className="status-dot" />Promotion pending</span> : <><select id={`team-role-${userId}`} value={value} onChange={(event) => setValue(event.target.value as Role)} disabled={!canEdit || saving}>{options.map((option) => <option key={option} value={option}>{option === "admin" ? "Administrator" : option === "manager" ? "Manager" : "Customer"}</option>)}</select><button className="button button-small button-secondary" type="submit" disabled={!canEdit || saving || value === role}><Save size={13} />{saving ? "Saving…" : value === "manager" && role === "attendee" ? "Request" : "Save"}</button></>}{disabled ? <span className="muted">Your role</span> : !canEdit && !promotionPending ? <span className="muted">View only</span> : message ? <span className={message === "Saved" || message === "Approval request sent" ? "form-success" : "form-error"} role="status">{message}</span> : null}</form>;
}
