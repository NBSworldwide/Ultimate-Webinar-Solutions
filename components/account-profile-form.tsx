"use client";

import { Save } from "lucide-react";
import { useState, type FormEvent } from "react";
import type { AccountProfile, AccountProfileInput } from "@/lib/types";

export function AccountProfileForm({ profile }: { profile: AccountProfile }) {
  const [form, setForm] = useState<AccountProfileInput>({
    name: profile.name,
    email: profile.email,
    phone: profile.phone,
    mobilePhone: profile.mobilePhone,
    addressLine1: profile.addressLine1,
    addressLine2: profile.addressLine2,
    city: profile.city,
    region: profile.region,
    postalCode: profile.postalCode,
    country: profile.country,
  });
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  function update(field: keyof AccountProfileInput, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/account/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await response.json() as { error?: string; message?: string; profile?: AccountProfile };
      if (!response.ok) throw new Error(data.error ?? "Your account profile could not be saved.");
      if (data.profile) setForm((current) => ({ ...current, ...data.profile }));
      setMessage(data.message ?? "Profile saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Your account profile could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  return <form className="account-profile-form panel" onSubmit={submit}>
    <div className="panel-header"><div><span className="eyebrow">Account details</span><h2 className="panel-title">Your profile</h2><span className="row-meta">Update your contact and shipping details. Changes to email require both inboxes to verify.</span></div></div>
    <div className="form-grid account-profile-grid">
      <div className="field"><label htmlFor="account-name">Full name</label><input id="account-name" autoComplete="name" value={form.name} onChange={(event) => update("name", event.target.value)} required /></div>
      <div className="field"><label htmlFor="account-email">Email address</label><input id="account-email" type="email" autoComplete="email" value={form.email} onChange={(event) => update("email", event.target.value)} required /><small className="field-help">Changing this sends one verification link to your current address and one to the new address.</small></div>
      <div className="field"><label htmlFor="account-phone">Phone number <span className="muted">(optional)</span></label><input id="account-phone" type="tel" autoComplete="tel" value={form.phone} onChange={(event) => update("phone", event.target.value)} /></div>
      <div className="field"><label htmlFor="account-mobile-phone">Mobile phone <span className="muted">(optional)</span></label><input id="account-mobile-phone" type="tel" autoComplete="tel-national" value={form.mobilePhone} onChange={(event) => update("mobilePhone", event.target.value)} /></div>
      <div className="field field-span-2"><label htmlFor="account-address-line1">Address</label><input id="account-address-line1" autoComplete="address-line1" value={form.addressLine1} onChange={(event) => update("addressLine1", event.target.value)} /></div>
      <div className="field field-span-2"><label htmlFor="account-address-line2">Address line 2 <span className="muted">(optional)</span></label><input id="account-address-line2" autoComplete="address-line2" value={form.addressLine2} onChange={(event) => update("addressLine2", event.target.value)} /></div>
      <div className="field"><label htmlFor="account-city">City</label><input id="account-city" autoComplete="address-level2" value={form.city} onChange={(event) => update("city", event.target.value)} /></div>
      <div className="field"><label htmlFor="account-region">State or region</label><input id="account-region" autoComplete="address-level1" value={form.region} onChange={(event) => update("region", event.target.value)} /></div>
      <div className="field"><label htmlFor="account-postal-code">ZIP or postal code</label><input id="account-postal-code" autoComplete="postal-code" value={form.postalCode} onChange={(event) => update("postalCode", event.target.value)} /></div>
      <div className="field"><label htmlFor="account-country">Country</label><input id="account-country" autoComplete="country-name" value={form.country} onChange={(event) => update("country", event.target.value)} /></div>
    </div>
    {message ? <p className={message.includes("could not") || message.includes("already used") ? "form-error" : "form-success"} role="status">{message}</p> : null}
    <button className="button" type="submit" disabled={saving}><Save size={15} />{saving ? "Saving…" : "Save profile"}</button>
  </form>;
}
