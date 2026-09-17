"use client";

import { KeyRound, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { emailProviders, streamingProviders, type EmailProvider, type StreamingProvider } from "@/lib/integration-catalog";
import type { IntegrationSettingsView } from "@/lib/types";

type Values = Record<string, string>;

export function IntegrationSettingsForm({ settings }: { settings: IntegrationSettingsView }) {
  const router = useRouter();
  const [streamingProvider, setStreamingProvider] = useState<StreamingProvider | "">(settings.streamingProvider ?? "");
  const [emailProvider, setEmailProvider] = useState<EmailProvider | "">(settings.emailProvider ?? "");
  const [streamingValues, setStreamingValues] = useState<Values>(settings.streamingValues);
  const [emailValues, setEmailValues] = useState<Values>(settings.emailValues);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  function update(setter: (value: (current: Values) => Values) => void, name: string, value: string) {
    setter((current) => ({ ...current, [name]: value }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/integrations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ streamingProvider: streamingProvider || null, emailProvider: emailProvider || null, streamingValues, emailValues }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "The integration settings could not be saved.");
      setMessage("Integration settings saved securely.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The integration settings could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  function renderFields(kind: "streaming" | "email") {
    const provider = kind === "streaming" ? streamingProvider : emailProvider;
    const values = kind === "streaming" ? streamingValues : emailValues;
    const setValues = kind === "streaming" ? setStreamingValues : setEmailValues;
    const savedSecrets = kind === "streaming" ? settings.savedStreamingSecrets : settings.savedEmailSecrets;
    const fields = kind === "streaming"
      ? streamingProviders.find((item) => item.value === provider)?.fields ?? []
      : emailProviders.find((item) => item.value === provider)?.fields ?? [];
    return fields.map((field) => <div className="field" key={`${kind}-${field.name}`}>
      <label htmlFor={`integration-${kind}-${field.name}`}>{field.label}</label>
      <input id={`integration-${kind}-${field.name}`} type={field.type ?? "text"} value={values[field.name] ?? ""} onChange={(event) => update(setValues, field.name, event.target.value)} placeholder={field.secret && savedSecrets.includes(field.name) ? "Saved securely — leave blank to keep" : field.placeholder} autoComplete={field.secret ? "new-password" : "off"} required={field.required !== false && (!field.secret || !savedSecrets.includes(field.name))} />
      <small>{field.help}{field.secret && savedSecrets.includes(field.name) ? " A saved value is already present." : ""}</small>
    </div>);
  }

  const selectedStreaming = streamingProviders.find((provider) => provider.value === streamingProvider);
  const selectedEmail = emailProviders.find((provider) => provider.value === emailProvider);

  return <form className="admin-form-card site-settings-form" onSubmit={submit}>
    <div className="panel-header"><div><span className="eyebrow">Delivery connections</span><h2>Streaming and email providers</h2><p className="form-help">Choose the services that will eventually power live delivery, replay events, and transactional attendee email. Credentials are encrypted before they are stored and are never returned to the browser.</p></div><KeyRound size={19} color="#0f776e" /></div>
    <div className="form-grid">
      <section className="settings-form-section" aria-labelledby="streaming-provider-title">
        <h3 id="streaming-provider-title">Live streaming provider</h3>
        <div className="field"><label htmlFor="streaming-provider">Provider</label><select id="streaming-provider" value={streamingProvider} onChange={(event) => setStreamingProvider(event.target.value as StreamingProvider | "")}><option value="">Not configured</option>{streamingProviders.map((provider) => <option value={provider.value} key={provider.value}>{provider.label}</option>)}</select><small>{selectedStreaming?.description ?? "Choose a provider when you are ready to connect live session delivery."}</small></div>
        {streamingProvider ? <div className="integration-field-grid">{renderFields("streaming")}</div> : null}
      </section>
      <section className="settings-form-section" aria-labelledby="email-provider-title">
        <h3 id="email-provider-title">Transactional email provider</h3>
        <div className="field"><label htmlFor="email-provider">Provider</label><select id="email-provider" value={emailProvider} onChange={(event) => setEmailProvider(event.target.value as EmailProvider | "")}><option value="">Not configured</option>{emailProviders.map((provider) => <option value={provider.value} key={provider.value}>{provider.label}</option>)}</select><small>{selectedEmail?.description ?? "Choose a provider when you are ready to deliver attendee and order messages."}</small></div>
        {emailProvider ? <div className="integration-field-grid">{renderFields("email")}</div> : null}
      </section>
    </div>
    {message ? <p className={message === "Integration settings saved securely." ? "form-success" : "form-error"} role={message === "Integration settings saved securely." ? "status" : "alert"}>{message}</p> : null}
    <div className="form-actions"><button className="button" type="submit" disabled={saving}><Save size={15} />{saving ? "Saving integrations…" : "Save integration settings"}</button><span className="form-help">Provider adapters can be activated after credentials and verified sending/streaming domains are ready.</span></div>
  </form>;
}
