"use client";

import { Building2, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { SiteSettings } from "@/lib/types";

type EditableSettings = Omit<SiteSettings, "id" | "updatedAt" | "updatedBy">;

const fields: Array<{ name: keyof EditableSettings; label: string; type?: string; placeholder?: string; span?: boolean }> = [
  { name: "displayName", label: "Display name", placeholder: "Webinar Studio" },
  { name: "legalName", label: "Legal company name", placeholder: "Optional legal entity name" },
  { name: "tagline", label: "Tagline", placeholder: "A short description used in public surfaces", span: true },
  { name: "description", label: "Organization description", placeholder: "What this organization does", span: true },
  { name: "logoUrl", label: "Logo URL", type: "url", placeholder: "https://example.com/logo.svg", span: true },
  { name: "logoAlt", label: "Logo alt text", placeholder: "Your company name" },
  { name: "primaryEmail", label: "Primary email", type: "email", placeholder: "hello@example.com" },
  { name: "supportEmail", label: "Customer support email", type: "email", placeholder: "support@example.com" },
  { name: "phone", label: "Contact phone", type: "tel", placeholder: "+1 555 010 0142" },
  { name: "websiteUrl", label: "Company website", type: "url", placeholder: "https://example.com", span: true },
];

export function SiteSettingsForm({ settings }: { settings: SiteSettings }) {
  const router = useRouter();
  const [form, setForm] = useState<EditableSettings>(() => ({
    displayName: settings.displayName, legalName: settings.legalName, tagline: settings.tagline, description: settings.description,
    logoUrl: settings.logoUrl, logoAlt: settings.logoAlt, primaryEmail: settings.primaryEmail, supportEmail: settings.supportEmail,
    phone: settings.phone, addressLine1: settings.addressLine1, addressLine2: settings.addressLine2, city: settings.city,
    region: settings.region, postalCode: settings.postalCode, country: settings.country, websiteUrl: settings.websiteUrl,
    timezone: settings.timezone, currency: settings.currency, supportUrl: settings.supportUrl, privacyUrl: settings.privacyUrl,
    termsUrl: settings.termsUrl, shippingPolicyUrl: settings.shippingPolicyUrl, businessHours: settings.businessHours,
    linkedinUrl: settings.linkedinUrl, facebookUrl: settings.facebookUrl, instagramUrl: settings.instagramUrl, ageGateEnabled: settings.ageGateEnabled,
  }));
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  function update(name: keyof EditableSettings, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "The company profile could not be saved.");
      setMessage("Company profile saved.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The company profile could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="admin-form-card site-settings-form" onSubmit={submit}>
      <div className="panel-header"><div><span className="eyebrow">Site identity</span><h2>Company profile</h2><p className="form-help">Enter this once and the public header, footer, metadata, structured data, and future correspondence can reuse it.</p></div><Building2 size={19} color="#0f776e" /></div>
      <div className="form-grid">
        <section className="settings-form-section" aria-labelledby="settings-branding-title">
          <h3 id="settings-branding-title">Brand and description</h3>
          <div className="form-row">
            {fields.slice(0, 2).map((field) => <div className="field" key={field.name}><label htmlFor={`site-settings-${field.name}`}>{field.label}</label><input id={`site-settings-${field.name}`} type={field.type ?? "text"} value={form[field.name] as string} onChange={(event) => update(field.name, event.target.value)} placeholder={field.placeholder} required={field.name === "displayName"} /></div>)}
          </div>
          {fields.slice(2, 4).map((field) => <div className="field" key={field.name}><label htmlFor={`site-settings-${field.name}`}>{field.label}</label><textarea id={`site-settings-${field.name}`} rows={field.name === "description" ? 3 : 2} value={form[field.name] as string} onChange={(event) => update(field.name, event.target.value)} placeholder={field.placeholder} /></div>)}
          <div className="form-row">{fields.slice(4, 6).map((field) => <div className="field" key={field.name}><label htmlFor={`site-settings-${field.name}`}>{field.label}</label><input id={`site-settings-${field.name}`} type={field.type ?? "text"} value={form[field.name] as string} onChange={(event) => update(field.name, event.target.value)} placeholder={field.placeholder} /></div>)}</div>
          <div className="form-row">{fields.slice(6, 8).map((field) => <div className="field" key={field.name}><label htmlFor={`site-settings-${field.name}`}>{field.label}</label><input id={`site-settings-${field.name}`} type={field.type ?? "text"} value={form[field.name] as string} onChange={(event) => update(field.name, event.target.value)} placeholder={field.placeholder} /></div>)}</div>
          {fields.slice(8).map((field) => <div className="field" key={field.name}><label htmlFor={`site-settings-${field.name}`}>{field.label}</label><input id={`site-settings-${field.name}`} type={field.type ?? "text"} value={form[field.name] as string} onChange={(event) => update(field.name, event.target.value)} placeholder={field.placeholder} /></div>)}
          <small>Logo URLs may point to a public asset such as an uploaded CDN file or a file in the application’s public folder. File-upload storage can be connected later.</small>
        </section>

        <section className="settings-form-section" aria-labelledby="settings-contact-title">
          <h3 id="settings-contact-title">Address and operating details</h3>
          <div className="field"><label htmlFor="site-settings-addressLine1">Address line 1</label><input id="site-settings-addressLine1" value={form.addressLine1} onChange={(event) => update("addressLine1", event.target.value)} placeholder="100 Example Way" /></div>
          <div className="field"><label htmlFor="site-settings-addressLine2">Address line 2</label><input id="site-settings-addressLine2" value={form.addressLine2} onChange={(event) => update("addressLine2", event.target.value)} placeholder="Suite 200" /></div>
          <div className="form-row"><div className="field"><label htmlFor="site-settings-city">City</label><input id="site-settings-city" value={form.city} onChange={(event) => update("city", event.target.value)} placeholder="Arlington" /></div><div className="field"><label htmlFor="site-settings-region">State / region</label><input id="site-settings-region" value={form.region} onChange={(event) => update("region", event.target.value)} placeholder="TX" /></div></div>
          <div className="form-row"><div className="field"><label htmlFor="site-settings-postalCode">Postal code</label><input id="site-settings-postalCode" value={form.postalCode} onChange={(event) => update("postalCode", event.target.value)} placeholder="76014" /></div><div className="field"><label htmlFor="site-settings-country">Country code</label><input id="site-settings-country" maxLength={2} value={form.country} onChange={(event) => update("country", event.target.value.toUpperCase())} placeholder="US" required /></div></div>
          <div className="form-row"><div className="field"><label htmlFor="site-settings-timezone">Default timezone</label><input id="site-settings-timezone" value={form.timezone} onChange={(event) => update("timezone", event.target.value)} placeholder="America/Chicago" required /></div><div className="field"><label htmlFor="site-settings-currency">Currency</label><input id="site-settings-currency" maxLength={3} value={form.currency} onChange={(event) => update("currency", event.target.value.toUpperCase())} placeholder="USD" required /></div></div>
          <div className="field"><label htmlFor="site-settings-businessHours">Business hours</label><textarea id="site-settings-businessHours" rows={2} value={form.businessHours} onChange={(event) => update("businessHours", event.target.value)} placeholder="Monday–Friday, 9:00 AM–5:00 PM Central" /></div>
        </section>

        <section className="settings-form-section" aria-labelledby="settings-access-title">
          <h3 id="settings-access-title">Visitor access</h3>
          <label className="check-field"><input name="ageGateEnabled" type="checkbox" checked={form.ageGateEnabled} onChange={(event) => setForm((current) => ({ ...current, ageGateEnabled: event.target.checked }))} /><span><strong>Require an 18+ age gate</strong><small>Visitors must acknowledge that they are 18 or older before public pages are shown. This is an access acknowledgement, not legal age verification or a replacement for local compliance requirements.</small></span></label>
        </section>

        <section className="settings-form-section" aria-labelledby="settings-links-title">
          <h3 id="settings-links-title">Support, policies, and social links</h3>
          {(["supportUrl", "privacyUrl", "termsUrl", "shippingPolicyUrl", "linkedinUrl", "facebookUrl", "instagramUrl"] as const).map((name) => <div className="field" key={name}><label htmlFor={`site-settings-${name}`}>{({ supportUrl: "Support or contact page", privacyUrl: "Privacy policy", termsUrl: "Terms and conditions", shippingPolicyUrl: "Shipping and returns policy", linkedinUrl: "LinkedIn", facebookUrl: "Facebook", instagramUrl: "Instagram" }[name])}</label><input id={`site-settings-${name}`} type="url" value={form[name]} onChange={(event) => update(name, event.target.value)} placeholder="https://example.com/…" /></div>)}
        </section>
      </div>
      {message ? <p className={message === "Company profile saved." ? "form-success" : "form-error"} role={message === "Company profile saved." ? "status" : "alert"}>{message}</p> : null}
      <div className="form-actions"><button className="button" type="submit" disabled={saving}><Save size={15} />{saving ? "Saving profile…" : "Save company profile"}</button><span className="form-help">Changes apply to public branding after the next page render.</span></div>
    </form>
  );
}
