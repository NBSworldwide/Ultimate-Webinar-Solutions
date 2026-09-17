"use client";

import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Role } from "@/lib/types";

export function TeamRoleForm({ userId, role, disabled = false }: { userId: string; role: Role; disabled?: boolean }) {
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
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "The account role could not be updated.");
      setMessage("Saved");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The account role could not be updated.");
    } finally {
      setSaving(false);
    }
  }

  return <form className="team-role-form" onSubmit={submit}><label className="sr-only" htmlFor={`team-role-${userId}`}>Account role</label><select id={`team-role-${userId}`} value={value} onChange={(event) => setValue(event.target.value as Role)} disabled={disabled || saving}><option value="admin">Administrator</option><option value="manager">Manager</option><option value="attendee">Customer</option></select><button className="button button-small button-secondary" type="submit" disabled={disabled || saving || value === role}><Save size={13} />{saving ? "Saving…" : "Save"}</button>{disabled ? <span className="muted">Your role</span> : message ? <span className={message === "Saved" ? "form-success" : "form-error"} role="status">{message}</span> : null}</form>;
}
