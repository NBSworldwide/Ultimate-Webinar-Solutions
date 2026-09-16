"use client";

import { useState } from "react";
import { Dice5, Sparkles } from "lucide-react";

export function WinnerButton({ webinarId, hasWinner }: { webinarId: string; hasWinner: boolean }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  async function draw() {
    if (hasWinner || loading) return;
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/webinars/${webinarId}/draw`, { method: "POST" });
      const data = await response.json() as { winner?: { customerName: string; seatNumber: number }; error?: string };
      if (!response.ok || !data.winner) throw new Error(data.error ?? "The draw could not be completed.");
      setMessage(`Winner selected: ${data.winner.customerName}, seat ${data.winner.seatNumber}.`);
      window.setTimeout(() => window.location.reload(), 900);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The draw could not be completed.");
      setLoading(false);
    }
  }
  return <div><button type="button" className="button button-small button-coral" onClick={draw} disabled={hasWinner || loading}><Dice5 size={14} />{hasWinner ? "Winner recorded" : loading ? "Drawing…" : "Draw winner"}</button>{message ? <span className="form-success" style={{ display: "block", marginTop: 8 }}>{message}</span> : null}</div>;
}
