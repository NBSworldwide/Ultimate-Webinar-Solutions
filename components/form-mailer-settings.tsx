"use client";

import { useState } from "react";
import { CheckCircle2, Send, Save } from "lucide-react";
import type { FormMailerProvider, FormMailerSettings } from "@/lib/types";

const providers: Array<{ value: FormMailerProvider; label: string; description: string }> = [
  { value: "native", label: "Native queue", description: "Local delivery log; safe for this standalone demo" },
  { value: "smtp", label: "SMTP", description: "Generic SMTP adapter" },
  { value: "brevo", label: "Brevo", description: "Transactional email adapter" },
  { value: "mailjet", label: "Mailjet", description: "Transactional email adapter" },
  { value: "sendgrid", label: "SendGrid", description: "Transactional email adapter" },
  { value: "gmail", label: "Gmail", description: "OAuth or SMTP adapter" },
  { value: "resend", label: "Resend", description: "Transactional email adapter" },
  { value: "mailgun", label: "Mailgun", description: "Transactional email adapter" },
  { value: "ses", label: "Amazon SES", description: "Transactional email adapter" },
  { value: "postmark", label: "Postmark", description: "Transactional email adapter" },
];

export function FormMailerSettingsForm({ initialSettings }: { initialSettings: FormMailerSettings }) {
  const [settings, setSettings] = useState(initialSettings);
  const [secrets, setSecrets] = useState<Record<string, string>>({});
  const [clearSecrets, setClearSecrets] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const updateSetting = (key: string, value: string | number | boolean) => setSettings((current) => ({ ...current, settings: { ...current.settings, [key]: value } }));
  const updateSecret = (key: string, value: string) => { setSecrets((current) => ({ ...current, [key]: value })); setClearSecrets((current) => current.filter((item) => item !== key)); };
  const clearSecret = (key: string) => { setSecrets((current) => ({ ...current, [key]: "" })); setClearSecrets((current) => current.includes(key) ? current : [...current, key]); };

  async function save() {
    setSaving(true); setMessage(""); setError("");
    try {
      const response = await fetch("/api/admin/forms/mailer", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ primaryProvider: settings.primaryProvider, backupProvider: settings.backupProvider, fromName: settings.fromName, fromEmail: settings.fromEmail, forceFrom: settings.forceFrom, settings: settings.settings, secrets, clearSecrets }) });
      const body = await response.json() as { error?: string; mailer?: FormMailerSettings };
      if (!response.ok || !body.mailer) throw new Error(body.error || "Mailer settings could not be saved.");
      setSettings(body.mailer); setSecrets({}); setClearSecrets([]); setMessage("Mailer settings saved. Secret values are never returned to the browser.");
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Mailer settings could not be saved."); } finally { setSaving(false); }
  }

  async function test() {
    setTesting(true); setMessage(""); setError("");
    try { const response = await fetch("/api/admin/forms/mailer", { method: "POST" }); const body = await response.json() as { error?: string; result?: { message: string; testedAt: string } }; if (!response.ok || !body.result) throw new Error(body.error || "The mailer test could not be recorded."); setMessage(body.result.message); setSettings((current) => ({ ...current, lastTestedAt: body.result!.testedAt })); } catch (testError) { setError(testError instanceof Error ? testError.message : "The mailer test could not be recorded."); } finally { setTesting(false); }
  }

  return <section className="panel mailer-settings-form"><div className="panel-header"><div><span className="eyebrow">Form delivery</span><h2 className="panel-title">Mailer settings</h2><p className="row-meta">Provider credentials are encrypted server-side and never sent back to the browser.</p></div><div className="detail-actions"><button type="button" className="button button-secondary" onClick={test} disabled={testing}><Send size={14} />{testing ? "Testing…" : "Record local test"}</button><button type="button" className="button" onClick={save} disabled={saving}><Save size={14} />{saving ? "Saving…" : "Save settings"}</button></div></div><div className="notice-banner builder-notice"><CheckCircle2 size={16} /><span><strong>Standalone delivery boundary.</strong> Submissions create local delivery records only. This screen records configuration and test status without contacting an external provider.</span></div><div className="form-grid"><div className="field"><label htmlFor="mailer-primary">Primary provider</label><select id="mailer-primary" value={settings.primaryProvider} onChange={(event) => setSettings((current) => ({ ...current, primaryProvider: event.target.value as FormMailerProvider }))}>{providers.map((provider) => <option value={provider.value} key={provider.value}>{provider.label} — {provider.description}</option>)}</select></div><div className="field"><label htmlFor="mailer-backup">Backup provider</label><select id="mailer-backup" value={settings.backupProvider ?? ""} onChange={(event) => setSettings((current) => ({ ...current, backupProvider: event.target.value ? event.target.value as FormMailerProvider : null }))}><option value="">No backup provider</option>{providers.filter((provider) => provider.value !== settings.primaryProvider).map((provider) => <option value={provider.value} key={provider.value}>{provider.label}</option>)}</select></div><div className="field"><label htmlFor="mailer-from-name">From name</label><input id="mailer-from-name" value={settings.fromName} onChange={(event) => setSettings((current) => ({ ...current, fromName: event.target.value }))} placeholder="Webinar Studio" /></div><div className="field"><label htmlFor="mailer-from-email">From email</label><input id="mailer-from-email" type="email" value={settings.fromEmail} onChange={(event) => setSettings((current) => ({ ...current, fromEmail: event.target.value }))} placeholder="hello@example.test" /></div><label className="form-choice"><input type="checkbox" checked={settings.forceFrom} onChange={(event) => setSettings((current) => ({ ...current, forceFrom: event.target.checked }))} /><span>Force this sender for every form notification</span></label></div><section className="mailer-advanced-settings"><div className="panel-header"><div><span className="eyebrow">Provider connection</span><h3 className="panel-title">Connection details</h3></div></div><div className="form-grid"><div className="field"><label htmlFor="mailer-host">SMTP host or API endpoint</label><input id="mailer-host" value={String(settings.settings.host ?? settings.settings.endpoint ?? "")} onChange={(event) => updateSetting("host", event.target.value)} placeholder="smtp.example.test" /></div><div className="field"><label htmlFor="mailer-port">SMTP port</label><input id="mailer-port" type="number" value={String(settings.settings.port ?? "")} onChange={(event) => updateSetting("port", Number(event.target.value) || "")} placeholder="587" /></div><div className="field"><label htmlFor="mailer-username">Username or account ID</label><input id="mailer-username" value={String(settings.settings.username ?? settings.settings.accountId ?? "")} onChange={(event) => updateSetting("username", event.target.value)} /></div><div className="field"><label htmlFor="mailer-reply">Default reply-to</label><input id="mailer-reply" type="email" value={String(settings.settings.replyTo ?? "")} onChange={(event) => updateSetting("replyTo", event.target.value)} /></div></div><div className="mailer-secrets">{["apiKey", "apiToken", "password", "smtpPassword"].map((key) => <div className="field" key={key}><label htmlFor={`mailer-secret-${key}`}>{key}</label><div className="secret-input"><input id={`mailer-secret-${key}`} type="password" value={secrets[key] ?? ""} onChange={(event) => updateSecret(key, event.target.value)} placeholder={settings.savedSecrets.includes(key) ? "Saved — enter a new value to replace" : "Not configured"} autoComplete="new-password" /><button type="button" className="button button-secondary button-small" onClick={() => clearSecret(key)} disabled={!settings.savedSecrets.includes(key)}>Clear</button></div></div>)}</div></section>{settings.lastTestedAt ? <p className="row-meta">Last local test recorded {new Date(settings.lastTestedAt).toLocaleString()}.</p> : null}{error ? <p className="form-error" role="alert">{error}</p> : null}{message ? <p className="form-success" role="status">{message}</p> : null}</section>;
}
