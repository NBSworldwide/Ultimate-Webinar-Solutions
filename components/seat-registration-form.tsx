"use client";

import { useMemo, useState } from "react";
import { Check, LockKeyhole, ShieldCheck } from "lucide-react";
import { formatMoney } from "@/lib/format";
import type { HoldResult, TierView } from "@/lib/types";

interface SeatRegistrationFormProps {
  webinarId: string;
  tiers: TierView[];
}

export function SeatRegistrationForm({ webinarId, tiers }: SeatRegistrationFormProps) {
  const [activeTierId, setActiveTierId] = useState(tiers[0]?.id ?? "");
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [hold, setHold] = useState<HoldResult | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(true);
  const [status, setStatus] = useState<"idle" | "holding" | "registering" | "success">("idle");
  const [message, setMessage] = useState("");
  const activeTier = tiers.find((tier) => tier.id === activeTierId) ?? tiers[0];
  const selectedPrice = activeTier ? activeTier.priceCents * selectedSeats.length : 0;
  const seatsLeft = activeTier?.seats.filter((seat) => seat.status === "available").length ?? 0;
  const canChoose = !hold && status !== "holding";
  const totalLabel = useMemo(() => selectedSeats.length > 0 ? formatMoney(selectedPrice) : "Choose a seat", [selectedPrice, selectedSeats.length]);
  const messageIsError = /could|choose|unavailable|expired|processing|not open|too many/i.test(message);

  function switchTier(tierId: string) {
    setActiveTierId(tierId);
    setSelectedSeats([]);
    setHold(null);
    setMessage("");
  }

  function toggleSeat(seatId: string) {
    if (!canChoose) return;
    setSelectedSeats((current) => current.includes(seatId) ? current.filter((value) => value !== seatId) : current.length < 6 ? [...current, seatId] : current);
  }

  async function reserveSeats() {
    if (selectedSeats.length === 0) {
      setMessage("Choose at least one available seat first.");
      return;
    }
    setStatus("holding");
    setMessage("");
    try {
      const response = await fetch(`/api/webinars/${webinarId}/hold`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ seatIds: selectedSeats }) });
      const data = await response.json() as { hold?: HoldResult; error?: string };
      if (!response.ok || !data.hold) throw new Error(data.error ?? "Those seats could not be held.");
      setHold(data.hold);
      setStatus("idle");
      setMessage("Seats held for 10 minutes. Finish the demo registration below.");
    } catch (error) {
      setStatus("idle");
      setMessage(error instanceof Error ? error.message : "Those seats could not be held.");
    }
  }

  async function completeRegistration(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hold) return;
    setStatus("registering");
    setMessage("");
    try {
      const response = await fetch(`/api/webinars/${webinarId}/register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ holdToken: hold.holdToken, name, email, phone, consent }) });
      const data = await response.json() as { success?: boolean; error?: string };
      if (!response.ok || !data.success) throw new Error(data.error ?? "Registration could not be completed.");
      setStatus("success");
      setMessage("You are registered. A confirmation has been queued in the demo delivery ledger.");
    } catch (error) {
      setStatus("idle");
      setMessage(error instanceof Error ? error.message : "Registration could not be completed.");
    }
  }

  if (status === "success") {
    return <div className="registration-card"><div className="empty-icon"><Check size={21} /></div><h2>Registration confirmed</h2><p>{message}</p><div className="notice-banner"><ShieldCheck size={17} /><span>Demo mode is active. No payment provider or message is contacted from this local application.</span></div><a className="button" href="/login">Open attendee account</a></div>;
  }

  return (
    <section className="registration-card" aria-label="Registration">
      <span className="eyebrow">Reserve your place</span>
      <h2>Choose your seat</h2>
      <p>Seats are held server-side for 10 minutes while you finish registration.</p>
      <div className="tier-select" role="radiogroup" aria-label="Seat tier">
        {tiers.map((tier) => <div className="tier-option" key={tier.id}><label><input type="radio" name="tier" checked={activeTierId === tier.id} onChange={() => switchTier(tier.id)} /><span><strong>{tier.name}</strong><small>{tier.seats.filter((seat) => seat.status === "available").length} available</small></span></label><span className="tier-price">{formatMoney(tier.priceCents)}</span></div>)}
      </div>
      {activeTier ? <div className="seat-picker"><div className="tier-header"><h3>Available seats</h3><span>{seatsLeft} remaining · max 6</span></div><div className="seat-picker-grid">{activeTier.seats.map((seat) => { const unavailable = seat.status !== "available"; const selected = selectedSeats.includes(seat.id); return <button type="button" key={seat.id} aria-label={`Seat ${seat.number}${unavailable ? ", unavailable" : ""}`} className={`seat-button ${unavailable ? "unavailable" : ""} ${selected ? "selected" : ""}`} disabled={unavailable || !canChoose} onClick={() => toggleSeat(seat.id)}>{seat.number}</button>; })}</div></div> : null}
      {hold ? <form className="form-grid" onSubmit={completeRegistration}><div className="notice-banner"><LockKeyhole size={16} /><span>{hold.seats.length} seat{hold.seats.length === 1 ? "" : "s"} held until {new Date(hold.expiresAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}.</span></div><div className="form-row"><div className="field"><label htmlFor="registration-name">Full name</label><input id="registration-name" name="name" autoComplete="name" required value={name} onChange={(event) => setName(event.target.value)} placeholder="Alex Morgan" /></div><div className="field"><label htmlFor="registration-phone">Phone</label><input id="registration-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" required value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="(555) 010-0142" /></div></div><div className="field"><label htmlFor="registration-email">Email</label><input id="registration-email" name="email" type="email" inputMode="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="alex@example.com" /></div><label className="check-field"><input name="consent" type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span>Send me practical session updates by email and SMS.</span></label><button className="button" type="submit" disabled={status === "registering"}>{status === "registering" ? "Confirming…" : `Complete demo registration · ${totalLabel}`}</button></form> : <button className="button" type="button" onClick={reserveSeats} disabled={status === "holding"}>{status === "holding" ? "Holding seats…" : `Hold selected seats · ${totalLabel}`}</button>}
      {message ? <p className={messageIsError ? "form-error" : "form-success"} role={messageIsError ? "alert" : "status"}>{message}</p> : null}
    </section>
  );
}
