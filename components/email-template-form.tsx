"use client";

import { MailPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function EmailTemplateForm() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", slug: "", triggerKey: "", messageType: "transactional", subject: "", preheader: "", htmlBody: "<h1>Hello {{customer_name}}</h1>\n<p>Write your message here.</p>", textBody: "Hello {{customer_name}}\n\nWrite your message here.", status: "draft" });
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  function update(name: string, value: string) { setForm((current) => ({ ...current, [name]: value })); }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setMessage("");
    try {
      const response = await fetch("/api/admin/email/templates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "The template could not be saved.");
      setForm({ name: "", slug: "", triggerKey: "", messageType: "transactional", subject: "", preheader: "", htmlBody: "<h1>Hello {{customer_name}}</h1>\n<p>Write your message here.</p>", textBody: "Hello {{customer_name}}\n\nWrite your message here.", status: "draft" });
      setMessage("Template saved."); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "The template could not be saved."); }
    finally { setSaving(false); }
  }
  return <form className="admin-form-card" onSubmit={submit}><h2>Create a reusable template</h2><div className="form-grid"><div className="form-row"><div className="field"><label htmlFor="email-template-name">Name</label><input id="email-template-name" value={form.name} onChange={(event) => update("name", event.target.value)} placeholder="Post-session feedback" required /></div><div className="field"><label htmlFor="email-template-slug">Slug</label><input id="email-template-slug" value={form.slug} onChange={(event) => update("slug", event.target.value)} placeholder="post-session-feedback" /></div></div><div className="form-row"><div className="field"><label htmlFor="email-template-trigger">Trigger key</label><input id="email-template-trigger" value={form.triggerKey} onChange={(event) => update("triggerKey", event.target.value)} placeholder="session.follow_up" required /></div><div className="field"><label htmlFor="email-template-type">Message type</label><select id="email-template-type" value={form.messageType} onChange={(event) => update("messageType", event.target.value)}><option value="transactional">Transactional</option><option value="marketing">Marketing</option></select></div></div><div className="form-row"><div className="field"><label htmlFor="email-template-subject">Subject</label><input id="email-template-subject" value={form.subject} onChange={(event) => update("subject", event.target.value)} placeholder="How did {{session_title}} go?" required /></div><div className="field"><label htmlFor="email-template-preheader">Preview text</label><input id="email-template-preheader" value={form.preheader} onChange={(event) => update("preheader", event.target.value)} placeholder="A short inbox preview" /></div></div><div className="form-row"><div className="field"><label htmlFor="email-template-html">HTML content</label><textarea id="email-template-html" rows={8} value={form.htmlBody} onChange={(event) => update("htmlBody", event.target.value)} required /><small>Use approved variables such as {"{{customer_name}}"} and {"{{session_access_link}}"}.</small></div><div className="field"><label htmlFor="email-template-text">Plain-text content</label><textarea id="email-template-text" rows={8} value={form.textBody} onChange={(event) => update("textBody", event.target.value)} required /></div></div><div className="field"><label htmlFor="email-template-status">Initial status</label><select id="email-template-status" value={form.status} onChange={(event) => update("status", event.target.value)}><option value="draft">Draft</option><option value="active">Active</option><option value="archived">Archived</option></select></div></div>{message ? <p className={message === "Template saved." ? "form-success" : "form-error"} role={message === "Template saved." ? "status" : "alert"}>{message}</p> : null}<button className="button" type="submit" disabled={saving}><MailPlus size={15} />{saving ? "Saving…" : "Save template"}</button></form>;
}
