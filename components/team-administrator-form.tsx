"use client";

import { ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { TeamUserView } from "@/lib/team";

export function TeamAdministratorOfRecordForm({ administrators, selectedId }: { administrators: TeamUserView[]; selectedId: string }) {
  const router = useRouter();
  const [value, setValue] = useState(selectedId);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/team/administrator-of-record", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: value }) });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "The administrator of record could not be saved.");
      setMessage("Administrator of Record saved.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The administrator of record could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  return <form className="admin-form-card" onSubmit={submit}><div className="panel-header"><div><h2>Administrator of Record</h2><p className="field-help">Promotion requests and their approval notifications go to this administrator.</p></div><ShieldCheck size={18} color="#0f776e" /></div><div className="field"><label htmlFor="administrator-of-record">Approval owner</label><select id="administrator-of-record" value={value} onChange={(event) => setValue(event.target.value)} disabled={saving}>{administrators.map((administrator) => <option key={administrator.id} value={administrator.id}>{administrator.name} · {administrator.username}</option>)}</select></div>{message ? <p className={message === "Administrator of Record saved." ? "form-success" : "form-error"} role={message === "Administrator of Record saved." ? "status" : "alert"}>{message}</p> : null}<button className="button button-secondary" type="submit" disabled={saving || value === selectedId}>{saving ? "Saving…" : "Save approval owner"}</button></form>;
}
