"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, LockKeyhole, ShieldCheck, UserRoundPlus } from "lucide-react";
import Link from "next/link";
import { formatMoney } from "@/lib/format";
import type { HoldResult, SeatStatus, TierView } from "@/lib/types";

interface SeatRegistrationFormProps {
  webinarId: string;
  tiers: TierView[];
  successHref?: string;
  successCtaLabel?: string;
  isFree?: boolean;
  isAuthenticated: boolean;
  customer: { name: string; email: string } | null;
  returnTo: string;
}

interface AvailabilityResponse {
  availability?: {
    tiers: Array<{ id: string; seats: Array<{ id: string; number: number; status: SeatStatus }> }>;
  };
  error?: string;
}

const AVAILABILITY_REFRESH_MS = 5_000;

export function SeatRegistrationForm({ webinarId, tiers, successHref = "/account", successCtaLabel = "Open attendee account", isFree = tiers.length > 0 && tiers.every((tier) => tier.priceCents === 0), isAuthenticated, customer, returnTo }: SeatRegistrationFormProps) {
  const [activeTierId, setActiveTierId] = useState(tiers[0]?.id ?? "");
  const [liveTiers, setLiveTiers] = useState(tiers);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [hold, setHold] = useState<HoldResult | null>(null);
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [smsConsent, setSmsConsent] = useState(false);
  const [status, setStatus] = useState<"idle" | "holding" | "registering" | "success">("idle");
  const [message, setMessage] = useState("");
  const [syncError, setSyncError] = useState("");
  const [holdSecondsRemaining, setHoldSecondsRemaining] = useState<number | null>(null);
  const selectedSeatsRef = useRef<string[]>([]);
  const activeTier = liveTiers.find((tier) => tier.id === activeTierId) ?? liveTiers[0];
  const selectedPrice = activeTier ? activeTier.priceCents * selectedSeats.length : 0;
  const seatsLeft = activeTier?.seats.filter((seat) => seat.status === "available").length ?? 0;
  const canChoose = !hold && status !== "holding";
  const totalLabel = selectedSeats.length > 0 ? formatMoney(selectedPrice) : "Choose a seat";
  const messageIsError = /could|choose|unavailable|expired|processing|not open|too many|account/i.test(message);

  const syncSeats = useCallback(async (signal: AbortSignal) => {
    const response = await fetch(`/api/webinars/${encodeURIComponent(webinarId)}/availability`, { cache: "no-store", signal });
    const data = await response.json() as AvailabilityResponse;
    if (!response.ok || !data.availability) throw new Error(data.error ?? "Seat availability could not be refreshed.");

    const latestByTier = new Map(data.availability.tiers.map((tier) => [tier.id, tier.seats]));
    const nextTiers = tiers.map((tier) => {
      const seats = latestByTier.get(tier.id);
      return seats ? { ...tier, seats } : tier;
    });
    const availableSeatIds = new Set(nextTiers.flatMap((tier) => tier.seats).filter((seat) => seat.status === "available").map((seat) => seat.id));
    const currentSelection = selectedSeatsRef.current;
    const nextSelection = currentSelection.filter((seatId) => availableSeatIds.has(seatId));
    if (nextSelection.length !== currentSelection.length) {
      selectedSeatsRef.current = nextSelection;
      setSelectedSeats(nextSelection);
      setMessage("Seat availability changed. A seat held by another customer was removed from your selection.");
    }
    setLiveTiers(nextTiers);
    setSyncError("");
  }, [tiers, webinarId]);

  useEffect(() => {
    if (!isAuthenticated || hold || status === "success") return;
    const controller = new AbortController();
    let active = true;
    const refresh = async () => {
      try {
        await syncSeats(controller.signal);
      } catch (error) {
        if (active && !(error instanceof Error && error.name === "AbortError")) setSyncError(error instanceof Error ? error.message : "Seat availability could not be refreshed.");
      }
    };
    void refresh();
    const intervalId = window.setInterval(() => void refresh(), AVAILABILITY_REFRESH_MS);
    const onFocus = () => void refresh();
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      active = false;
      controller.abort();
      window.clearInterval(intervalId);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [hold, isAuthenticated, status, syncSeats]);

  useEffect(() => {
    if (!hold) return;
    const updateRemaining = () => {
      const seconds = Math.max(0, Math.ceil((new Date(hold.expiresAt).getTime() - Date.now()) / 1000));
      setHoldSecondsRemaining(seconds);
      if (seconds === 0) {
        selectedSeatsRef.current = [];
        setSelectedSeats([]);
        setHold(null);
        setMessage("Your five-minute seat hold expired. Please choose your seats again.");
      }
    };
    updateRemaining();
    const intervalId = window.setInterval(updateRemaining, 1_000);
    return () => window.clearInterval(intervalId);
  }, [hold]);

  function switchTier(tierId: string) {
    setActiveTierId(tierId);
    selectedSeatsRef.current = [];
    setSelectedSeats([]);
    setHold(null);
    setMessage("");
  }

  function toggleSeat(seatId: string) {
    if (!canChoose) return;
    const nextSelection = selectedSeatsRef.current.includes(seatId)
      ? selectedSeatsRef.current.filter((value) => value !== seatId)
      : selectedSeatsRef.current.length < 6 ? [...selectedSeatsRef.current, seatId] : selectedSeatsRef.current;
    selectedSeatsRef.current = nextSelection;
    setSelectedSeats(nextSelection);
  }

  async function reserveSeats() {
    if (selectedSeatsRef.current.length === 0) {
      setMessage("Choose at least one available seat first.");
      return;
    }
    setStatus("holding");
    setMessage("");
    try {
      const response = await fetch(`/api/webinars/${webinarId}/hold`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ seatIds: selectedSeatsRef.current }) });
      const data = await response.json() as { hold?: HoldResult; error?: string };
      if (!response.ok || !data.hold) throw new Error(data.error ?? "Those seats could not be held.");
      setHold(data.hold);
      setStatus("idle");
      setMessage(`Seats held for 5 minutes. ${isFree ? "Finish your free registration below." : "Finish registration below."}`);
    } catch (error) {
      setStatus("idle");
      setMessage(error instanceof Error ? error.message : "Those seats could not be held.");
      void syncSeats(new AbortController().signal).catch(() => undefined);
    }
  }

  async function completeRegistration(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hold) return;
    setStatus("registering");
    setMessage("");
    try {
      const response = await fetch(`/api/webinars/${webinarId}/register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ holdToken: hold.holdToken, phone, consent, smsConsent }) });
      const data = await response.json() as { success?: boolean; error?: string };
      if (!response.ok || !data.success) throw new Error(data.error ?? "Registration could not be completed.");
      setStatus("success");
      setMessage(`You are registered${isFree ? " for this free webinar" : ""}. A confirmation has been queued in the demo delivery ledger.`);
    } catch (error) {
      setStatus("idle");
      const errorMessage = error instanceof Error ? error.message : "Registration could not be completed.";
      if (/expired/i.test(errorMessage)) {
        selectedSeatsRef.current = [];
        setSelectedSeats([]);
        setHold(null);
      }
      setMessage(errorMessage);
    }
  }

  if (status === "success") {
    return <div className="registration-card"><div className="empty-icon"><Check size={21} /></div><h2>Registration confirmed</h2><p>{message}</p><div className="notice-banner"><ShieldCheck size={17} /><span>Demo mode is active. No payment provider or message is contacted from this local application.</span></div><a className="button" href={successHref}>{successCtaLabel}</a></div>;
  }

  if (!isAuthenticated) {
    const accountReturn = encodeURIComponent(returnTo);
    return <section className="registration-card" aria-label="Customer account required"><div className="empty-icon"><UserRoundPlus size={21} /></div><span className="eyebrow">Customer account required</span><h2>Create an account before reserving a seat.</h2><p>You can browse this session without an account, but no seat will be removed from inventory until you sign in or create a customer account.</p><div className="form-actions" style={{ justifyContent: "flex-start", flexWrap: "wrap", marginTop: 0 }}><Link className="button" href={`/signup?returnTo=${accountReturn}`}>Create customer account</Link><Link className="button button-secondary" href={`/login?returnTo=${accountReturn}`}>Sign in</Link></div><div className="notice-banner" style={{ marginTop: 16, marginBottom: 0 }}><ShieldCheck size={16} /><span>Your account keeps your session registrations and future product orders together.</span></div></section>;
  }

  return (
    <section className="registration-card" aria-label="Registration">
      <span className="eyebrow">Reserve your place</span>
      <h2>Choose your seat</h2>
      <p>Seats are held server-side for 5 minutes while you finish registration.</p>
      <div className="account-holder-summary"><LockKeyhole size={15} /><span><strong>{customer?.name ?? "Customer account"}</strong><small>{customer?.email ?? "Signed-in account"} · Registration will be attached to this account.</small></span></div>
      <div className="tier-select" role="radiogroup" aria-label="Seat tier">
        {liveTiers.map((tier) => <div className="tier-option" key={tier.id}><label><input type="radio" name="tier" checked={activeTierId === tier.id} onChange={() => switchTier(tier.id)} /><span><strong>{tier.name}</strong><small>{tier.seats.filter((seat) => seat.status === "available").length} available</small></span></label><span className="tier-price">{formatMoney(tier.priceCents)}</span></div>)}
      </div>
      {activeTier ? <div className="seat-picker"><div className="tier-header"><h3>Available seats</h3><span>{seatsLeft} remaining · max 6</span></div><div className="seat-picker-grid">{activeTier.seats.map((seat) => { const unavailable = seat.status !== "available"; const selected = selectedSeats.includes(seat.id); return <button type="button" key={seat.id} aria-label={`Seat ${seat.number}${unavailable ? ", unavailable" : ""}`} className={`seat-button ${unavailable ? "unavailable" : ""} ${selected ? "selected" : ""}`} disabled={unavailable || !canChoose} onClick={() => toggleSeat(seat.id)}>{seat.number}</button>; })}</div></div> : null}
      {syncError ? <p className="form-error" role="status">{syncError} The server will still verify the seat before reserving it.</p> : null}
      {hold ? <form className="form-grid" onSubmit={completeRegistration}><div className="notice-banner"><LockKeyhole size={16} /><span>{hold.seats.length} seat{hold.seats.length === 1 ? "" : "s"} held until {new Date(hold.expiresAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}{holdSecondsRemaining !== null ? ` · ${Math.floor(holdSecondsRemaining / 60)}:${String(holdSecondsRemaining % 60).padStart(2, "0")} remaining` : ""}.</span></div>{isFree ? <div className="notice-banner"><Check size={16} /><span>No payment is required for this webinar.</span></div> : null}<div className="field"><label htmlFor="registration-phone">Phone</label><input id="registration-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" required value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="(555) 010-0142" /></div><label className="check-field"><input name="consent" type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span>Send me practical session updates by email.</span></label><label className="check-field"><input name="smsConsent" type="checkbox" checked={smsConsent} onChange={(event) => setSmsConsent(event.target.checked)} /><span>Text me session reminders and winner notifications. Message and data rates may apply. Reply STOP to opt out.</span></label><button className="button" type="submit" disabled={status === "registering"}>{status === "registering" ? "Confirming…" : isFree ? "Register free" : `Complete demo registration · ${totalLabel}`}</button></form> : <button className="button" type="button" onClick={reserveSeats} disabled={status === "holding" || selectedSeats.length === 0}>{status === "holding" ? "Holding seats…" : isFree ? "Hold free seat" : `Hold selected seats · ${totalLabel}`}</button>}
      {message ? <p className={messageIsError ? "form-error" : "form-success"} role={messageIsError ? "alert" : "status"}>{message}</p> : null}
    </section>
  );
}
