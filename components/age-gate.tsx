"use client";

import { ShieldCheck } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState, useSyncExternalStore } from "react";

const AGE_COOKIE = "webinar_age_acknowledged=1";
const AGE_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

function readAgeCookie(): boolean {
  return typeof document !== "undefined" && document.cookie.split("; ").some((cookie) => cookie === AGE_COOKIE);
}

function subscribeToAgeCookie(_onStoreChange: () => void) {
  return () => undefined;
}

function isExemptPath(pathname: string): boolean {
  return pathname === "/login" || pathname.startsWith("/admin") || pathname.startsWith("/api") || pathname.startsWith("/_next");
}

export function AgeGate({ enabled, children }: { enabled: boolean; children: React.ReactNode }) {
  const pathname = usePathname();
  const browserAcknowledged = useSyncExternalStore(subscribeToAgeCookie, readAgeCookie, () => false);
  const [sessionAcknowledged, setSessionAcknowledged] = useState(false);
  const [declined, setDeclined] = useState(false);
  const acknowledged = browserAcknowledged || sessionAcknowledged;

  if (!enabled || isExemptPath(pathname)) return children;
  if (acknowledged) return children;

  if (declined) {
    return <main id="main-content" className="age-gate-page"><section className="age-gate-card" role="dialog" aria-labelledby="age-gate-declined-title"><span className="age-gate-icon"><ShieldCheck size={24} /></span><span className="eyebrow">Access not granted</span><h1 id="age-gate-declined-title">You chose not to enter.</h1><p>You can close this window or return when you are ready to confirm that you meet the site’s age requirement.</p><button className="button button-secondary" type="button" onClick={() => setDeclined(false)}>Return to age gate</button></section></main>;
  }

  function acknowledge() {
    document.cookie = `${AGE_COOKIE}; Max-Age=${AGE_COOKIE_MAX_AGE}; Path=/; SameSite=Lax`;
    setSessionAcknowledged(true);
  }

  return <main id="main-content" className="age-gate-page"><section className="age-gate-card" role="dialog" aria-modal="true" aria-labelledby="age-gate-title"><span className="age-gate-icon"><ShieldCheck size={24} /></span><span className="eyebrow">Age-restricted site</span><h1 id="age-gate-title">You must be 18 or older to enter.</h1><p>This site may contain age-restricted products and sessions. Confirm that you are at least 18 years old to continue.</p><div className="age-gate-actions"><button className="button" type="button" onClick={acknowledge}>I am 18 or older</button><button className="button button-secondary" type="button" onClick={() => setDeclined(true)}>Leave site</button></div><small>Access acknowledgement is stored in this browser for 30 days. Site owners remain responsible for applicable age-verification and sales requirements.</small></section></main>;
}
