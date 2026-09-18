"use client";

import { KeyRound } from "lucide-react";
import { useState } from "react";

export function TeamPasswordResetButton({ userId }: { userId: string }) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  async function sendReset() {
    setSending(true);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/team/${encodeURIComponent(userId)}/password-reset`, { method: "POST" });
      const data = await response.json() as { error?: string; message?: string };
      if (!response.ok) throw new Error(data.error ?? "The reset link could not be sent.");
      setMessage(data.message ?? "Reset link queued.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The reset link could not be sent.");
    } finally {
      setSending(false);
    }
  }

  return <div className="team-password-reset"><button className="button button-small button-secondary" type="button" onClick={() => void sendReset()} disabled={sending}><KeyRound size={13} />{sending ? "Sending…" : "Send reset link"}</button>{message ? <span className={message.includes("could not") ? "form-error" : "form-success"} role="status">{message}</span> : null}</div>;
}
