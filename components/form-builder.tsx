"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Copy, Eye, GripVertical, Plus, Save, Trash2 } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { FormRenderer } from "@/components/form-renderer";
import type { FormConfirmation, FormDefinition, FormField, FormFieldOption, FormNotification, FormSettings, FormStatus } from "@/lib/types";

const fieldGroups: Array<{ label: string; types: Array<{ type: FormField["fieldType"]; label: string; description: string }> }> = [
  {
    label: "Standard fields",
    types: [
      { type: "text", label: "Single-line text", description: "Short answer" },
      { type: "textarea", label: "Paragraph text", description: "Long answer" },
      { type: "select", label: "Dropdown", description: "One option" },
      { type: "radio", label: "Multiple choice", description: "One visible choice" },
      { type: "checkbox", label: "Checkboxes", description: "One or more choices" },
      { type: "number", label: "Number", description: "Numeric answer" },
      { type: "name", label: "Name", description: "First and last name" },
      { type: "email", label: "Email", description: "Email address" },
      { type: "range", label: "Number slider", description: "Bounded range" },
      { type: "captcha", label: "CAPTCHA", description: "Spam challenge hook" },
      { type: "consent", label: "GDPR / consent", description: "Explicit agreement" },
    ],
  },
  {
    label: "Advanced fields",
    types: [
      { type: "phone", label: "Phone", description: "Telephone number" },
      { type: "datetime", label: "Date and time", description: "Date/time picker" },
      { type: "address", label: "Address", description: "Address lines" },
      { type: "map", label: "Map", description: "Location query" },
      { type: "url", label: "Website URL", description: "Safe URL" },
      { type: "signature", label: "Signature", description: "Signature capture hook" },
      { type: "hidden", label: "Hidden field", description: "Non-visible value" },
    ],
  },
  {
    label: "Structure and content",
    types: [
      { type: "layout", label: "Layout", description: "Group fields visually" },
      { type: "page_break", label: "Page break", description: "Multi-step boundary" },
      { type: "divider", label: "Section divider", description: "Visual separator" },
      { type: "rich_text", label: "Rich text", description: "Formatted content" },
      { type: "html", label: "HTML", description: "Sanitized markup" },
    ],
  },
];

const fieldLabels = Object.fromEntries(fieldGroups.flatMap((group) => group.types.map((item) => [item.type, item.label]))) as Record<FormField["fieldType"], string>;
const defaultSettings: FormSettings = { enableConditionalLogic: true, storeSpamEntries: true, minimumSubmitSeconds: 3, countryFilter: [], keywordFilter: [], captchaProvider: "none", aiEnabled: false };

function createId(prefix: string): string {
  try {
    return `${prefix}-${crypto.randomUUID()}`;
  } catch {
    return `${prefix}-${Date.now()}-${Math.round(Math.random() * 10_000)}`;
  }
}

function createField(fieldType: FormField["fieldType"], index: number, formId: string): FormField {
  const fieldId = `${fieldType === "page_break" ? "step" : fieldType}_${index + 1}`;
  const choice = ["select", "radio", "checkbox"].includes(fieldType);
  return {
    id: createId("field"),
    formId,
    sortOrder: index,
    fieldType,
    label: fieldLabels[fieldType] ?? "Field",
    description: "",
    placeholder: "",
    fieldId,
    isRequired: !["layout", "page_break", "divider", "rich_text", "html"].includes(fieldType),
    options: choice ? [{ label: "Option one", value: "option-one" }, { label: "Option two", value: "option-two" }] : [],
    defaultValue: "",
    validation: fieldType === "range" ? { min: 0, max: 10 } : {},
    conditional: null,
    settings: {},
  };
}

function blankNotification(formId: string): FormNotification {
  return { id: createId("notification"), formId, sortOrder: 0, name: "Admin notification", enabled: true, recipientEmails: [], subject: "New form submission: {{form_name}}", fromName: "", fromEmail: "", replyTo: "", messageHtml: "<p>A new submission was received.</p>", condition: null, advanced: {} };
}

function blankConfirmation(formId: string): FormConfirmation {
  return { id: createId("confirmation"), formId, confirmationType: "message", messageHtml: "<p>Thanks — your response has been received.</p>", pageUrl: "", redirectUrl: "", autoScroll: true, entryPreview: false };
}

function commaList(value: string): string[] {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function OptionsEditor({ options, onChange }: { options: FormFieldOption[]; onChange: (options: FormFieldOption[]) => void }) {
  return <div className="builder-options"><div className="builder-subheader"><span>Choices</span><button type="button" className="button button-secondary button-small" onClick={() => onChange([...options, { label: `Option ${options.length + 1}`, value: `option-${options.length + 1}` }])}><Plus size={13} /> Add choice</button></div>{options.map((option, index) => <div className="form-row builder-option-row" key={`${option.value}-${index}`}><input aria-label={`Choice ${index + 1} label`} value={option.label} onChange={(event) => onChange(options.map((item, itemIndex) => itemIndex === index ? { ...item, label: event.target.value } : item))} placeholder="Visible label" /><input aria-label={`Choice ${index + 1} value`} value={option.value} onChange={(event) => onChange(options.map((item, itemIndex) => itemIndex === index ? { ...item, value: event.target.value } : item))} placeholder="Stored value" /><button type="button" className="icon-button icon-button-danger" aria-label={`Remove choice ${index + 1}`} onClick={() => onChange(options.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={14} /></button></div>)}</div>;
}

function ConditionEditor({ conditional, fields, onChange }: { conditional: FormField["conditional"]; fields: FormField[]; onChange: (conditional: FormField["conditional"]) => void }) {
  const candidates = fields.filter((item) => !["layout", "page_break", "divider", "rich_text", "html"].includes(item.fieldType));
  return <div className="builder-conditional"><label className="form-choice"><input type="checkbox" checked={Boolean(conditional)} onChange={(event) => onChange(event.target.checked ? { fieldId: candidates[0]?.fieldId ?? "", operator: "equals", value: "" } : null)} /><span>Show only when another answer matches</span></label>{conditional ? <div className="form-row"><select aria-label="Conditional source field" value={conditional.fieldId} onChange={(event) => onChange({ ...conditional, fieldId: event.target.value })}><option value="">Choose a source field</option>{candidates.map((item) => <option key={item.id} value={item.fieldId}>{item.label}</option>)}</select><select aria-label="Conditional operator" value={conditional.operator} onChange={(event) => onChange({ ...conditional, operator: event.target.value as NonNullable<FormField["conditional"]>["operator"] })}><option value="equals">equals</option><option value="not_equals">does not equal</option><option value="contains">contains</option><option value="not_empty">is not empty</option></select>{conditional.operator !== "not_empty" ? <input aria-label="Conditional value" value={conditional.value} onChange={(event) => onChange({ ...conditional, value: event.target.value })} placeholder="Expected answer" /> : null}</div> : null}</div>;
}

function numberValidation(field: FormField, key: "min" | "max", raw: string): Record<string, string | number | boolean> {
  const validation = { ...field.validation };
  if (raw === "") delete validation[key];
  else validation[key] = Number(raw);
  return validation;
}

function FieldEditor({ field, index, count, fields, onChange, onMove, onDuplicate, onDelete }: { field: FormField; index: number; count: number; fields: FormField[]; onChange: (patch: Partial<FormField>) => void; onMove: (direction: -1 | 1) => void; onDuplicate: () => void; onDelete: () => void }) {
  const structural = ["layout", "page_break", "divider", "rich_text", "html"].includes(field.fieldType);
  const choice = ["select", "radio", "checkbox"].includes(field.fieldType);
  const validationValue = (key: "min" | "max") => typeof field.validation[key] === "number" ? String(field.validation[key]) : "";
  return <article className={`builder-field ${structural ? "builder-field-structural" : ""}`}><div className="builder-field-header"><span className="builder-drag-handle" title="Drag to reorder"><GripVertical size={16} /></span><span className="builder-field-index">{index + 1}</span><div className="builder-field-title"><strong>{field.label || "Untitled field"}</strong><small>{fieldLabels[field.fieldType] ?? field.fieldType} · {field.fieldId}</small></div><div className="builder-field-actions"><button type="button" className="icon-button" aria-label="Move field up" disabled={index === 0} onClick={() => onMove(-1)}><ArrowUp size={14} /></button><button type="button" className="icon-button" aria-label="Move field down" disabled={index === count - 1} onClick={() => onMove(1)}><ArrowDown size={14} /></button><button type="button" className="icon-button" aria-label="Duplicate field" onClick={onDuplicate}><Copy size={14} /></button><button type="button" className="icon-button icon-button-danger" aria-label="Delete field" onClick={onDelete}><Trash2 size={14} /></button></div></div><div className="builder-field-body"><div className="form-row"><div className="field"><label>Field type</label><select value={field.fieldType} onChange={(event) => onChange({ fieldType: event.target.value as FormField["fieldType"], label: fieldLabels[event.target.value as FormField["fieldType"]] ?? field.label })}>{fieldGroups.flatMap((group) => group.types).map((item) => <option key={item.type} value={item.type}>{item.label}</option>)}</select></div><div className="field"><label>Field ID</label><input value={field.fieldId} onChange={(event) => onChange({ fieldId: event.target.value })} placeholder="email_address" /></div></div><div className="form-row"><div className="field"><label>Label</label><input value={field.label} onChange={(event) => onChange({ label: event.target.value })} /></div><div className="field"><label>Placeholder</label><input value={field.placeholder} onChange={(event) => onChange({ placeholder: event.target.value })} /></div></div><div className="field"><label>Description or help text</label><textarea value={field.description} onChange={(event) => onChange({ description: event.target.value })} rows={2} /></div>{!structural ? <label className="form-choice"><input type="checkbox" checked={field.isRequired} onChange={(event) => onChange({ isRequired: event.target.checked })} /><span>Required field</span></label> : null}{choice ? <OptionsEditor options={field.options} onChange={(options) => onChange({ options })} /> : null}{["number", "range"].includes(field.fieldType) ? <div className="form-row"><div className="field"><label>Minimum</label><input type="number" value={validationValue("min")} onChange={(event) => onChange({ validation: numberValidation(field, "min", event.target.value) })} /></div><div className="field"><label>Maximum</label><input type="number" value={validationValue("max")} onChange={(event) => onChange({ validation: numberValidation(field, "max", event.target.value) })} /></div></div> : null}{["rich_text", "html"].includes(field.fieldType) ? <div className="field"><label>Content</label><textarea value={typeof field.settings.content === "string" ? field.settings.content : ""} onChange={(event) => onChange({ settings: { ...field.settings, content: event.target.value } })} rows={5} placeholder="Add formatted content or safe HTML." /></div> : null}{!structural && fields.length > 1 ? <ConditionEditor conditional={field.conditional} fields={fields.filter((item) => item.id !== field.id)} onChange={(conditional) => onChange({ conditional })} /> : null}</div></article>;
}

export function FormBuilder({ form }: { form?: FormDefinition | null }) {
  const router = useRouter();
  const formId = form?.id ?? "preview-form";
  const [name, setName] = useState(form?.name ?? "Untitled form");
  const [slug, setSlug] = useState(form?.slug ?? "");
  const [description, setDescription] = useState(form?.description ?? "");
  const [status, setStatus] = useState<FormStatus>(form?.status ?? "draft");
  const [submitButtonText, setSubmitButtonText] = useState(form?.submitButtonText ?? "Submit");
  const [submittingText, setSubmittingText] = useState(form?.submittingText ?? "Sending…");
  const [fields, setFields] = useState<FormField[]>(form?.fields ?? []);
  const [notifications, setNotifications] = useState<FormNotification[]>(form?.notifications.length ? form.notifications : [blankNotification(formId)]);
  const [confirmation, setConfirmation] = useState<FormConfirmation>(form?.confirmation ?? blankConfirmation(formId));
  const [settings, setSettings] = useState<FormSettings>(form?.settings ?? defaultSettings);
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [draggedId, setDraggedId] = useState("");

  const previewForm = useMemo<FormDefinition>(() => ({ id: formId, name, slug: slug || "preview", description, tags: form?.tags ?? [], status, submitButtonText, submittingText, settings, fields, notifications, confirmation, entryCount: 0, unreadCount: 0, updatedAt: "", createdAt: "" }), [confirmation, description, fields, form?.tags, formId, name, notifications, settings, slug, status, submitButtonText, submittingText]);
  const updateField = (id: string, patch: Partial<FormField>) => setFields((current) => current.map((field) => field.id === id ? { ...field, ...patch } : field));
  const moveField = (id: string, direction: -1 | 1) => setFields((current) => { const index = current.findIndex((field) => field.id === id); const nextIndex = index + direction; if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current; const next = [...current]; [next[index], next[nextIndex]] = [next[nextIndex], next[index]]; return next.map((field, itemIndex) => ({ ...field, sortOrder: itemIndex })); });
  const duplicateField = (id: string) => setFields((current) => { const index = current.findIndex((field) => field.id === id); if (index < 0) return current; const original = current[index]; const copy: FormField = { ...original, id: createId("field"), fieldId: `${original.fieldId}_copy`, label: `${original.label} copy`, options: original.options.map((option) => ({ ...option })), validation: { ...original.validation }, settings: { ...original.settings } }; return [...current.slice(0, index + 1), copy, ...current.slice(index + 1)].map((field, itemIndex) => ({ ...field, sortOrder: itemIndex })); });
  const moveDraggedField = (targetId: string) => { if (!draggedId || draggedId === targetId) return; setFields((current) => { const from = current.findIndex((field) => field.id === draggedId); const to = current.findIndex((field) => field.id === targetId); if (from < 0 || to < 0) return current; const next = [...current]; const [item] = next.splice(from, 1); if (item) next.splice(to, 0, item); return next.map((field, index) => ({ ...field, sortOrder: index })); }); setDraggedId(""); };
  const addField = (type: FormField["fieldType"]) => setFields((current) => [...current, createField(type, current.length, formId)]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    const payload = { name, slug, description, tags: form?.tags ?? [], status, submitButtonText, submittingText, settings, fields, notifications, confirmation };
    try {
      const response = await fetch(form ? `/api/admin/forms/${encodeURIComponent(form.id)}` : "/api/admin/forms", { method: form ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const body = await response.json() as { error?: string; form?: { id: string } };
      if (!response.ok) throw new Error(body.error || "The form could not be saved.");
      setMessage("Form saved locally.");
      if (!form && body.form?.id) router.push(`/admin/forms/${body.form.id}/edit`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "The form could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  if (preview) return <div className="form-builder-preview"><div className="page-builder-toolbar"><div><span className="eyebrow">Form preview</span><h1 className="page-title">{name}</h1><p className="page-subtitle">This preview uses the current unsaved field configuration.</p></div><button type="button" className="button button-secondary" onClick={() => setPreview(false)}><ArrowLeft size={14} /> Back to builder</button></div><FormRenderer form={previewForm} /></div>;

  return <form className="form-builder" onSubmit={save}><div className="page-builder-toolbar"><div><span className="eyebrow">Form studio</span><h1 className="page-title">{form ? "Edit form" : "Create a form"}</h1><p className="page-subtitle">Build a reusable response flow, configure delivery and confirmation behavior, then publish it when the content is ready.</p></div><div className="detail-actions"><Link href="/admin/forms" className="button button-secondary"><ArrowLeft size={14} /> Forms</Link><button type="button" className="button button-secondary" onClick={() => setPreview(true)}><Eye size={14} /> Preview</button><button className="button" type="submit" disabled={saving}><Save size={14} />{saving ? "Saving…" : "Save form"}</button></div></div><div className="form-builder-layout"><section className="form-builder-main"><section className="admin-form-card"><div className="form-row"><div className="field"><label htmlFor="form-name">Form name</label><input id="form-name" value={name} onChange={(event) => setName(event.target.value)} required placeholder="Consultation request" /></div><div className="field"><label htmlFor="form-slug">Public slug</label><input id="form-slug" value={slug} onChange={(event) => setSlug(event.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, "-"))} placeholder="consultation-request" /><small>Public URL: /forms/{slug || "your-form"}</small></div></div><div className="form-row"><div className="field"><label htmlFor="form-status">Publishing state</label><select id="form-status" value={status} onChange={(event) => setStatus(event.target.value as FormStatus)}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></div><div className="field"><label htmlFor="form-description">Description</label><input id="form-description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Tell people what this form is for." /></div></div><div className="form-row"><div className="field"><label htmlFor="form-submit-text">Submit button label</label><input id="form-submit-text" value={submitButtonText} onChange={(event) => setSubmitButtonText(event.target.value)} /></div><div className="field"><label htmlFor="form-submitting-text">Submitting label</label><input id="form-submitting-text" value={submittingText} onChange={(event) => setSubmittingText(event.target.value)} /></div></div></section><section className="panel builder-fields-panel"><div className="panel-header"><div><span className="eyebrow">Field layout</span><h2 className="panel-title">Your fields <span className="muted">({fields.length})</span></h2></div><span className="row-meta">Drag to reorder</span></div>{fields.length > 0 ? <div className="builder-fields-list">{fields.map((field, index) => <div key={field.id} draggable onDragStart={() => setDraggedId(field.id)} onDragOver={(event) => event.preventDefault()} onDrop={() => moveDraggedField(field.id)}><FieldEditor field={field} index={index} count={fields.length} fields={fields} onChange={(patch) => updateField(field.id, patch)} onMove={(direction) => moveField(field.id, direction)} onDuplicate={() => duplicateField(field.id)} onDelete={() => setFields((current) => current.filter((item) => item.id !== field.id).map((item, itemIndex) => ({ ...item, sortOrder: itemIndex })))} /></div>)}</div> : <div className="empty-state"><Plus size={20} /><h3>Start with a field</h3><p>Choose a field type from the library.</p></div>}</section><section className="panel builder-settings-panel"><div className="panel-header"><div><span className="eyebrow">Submission settings</span><h2 className="panel-title">Spam protection and processing</h2></div></div><div className="form-grid"><label className="form-choice"><input type="checkbox" checked={settings.enableConditionalLogic} onChange={(event) => setSettings({ ...settings, enableConditionalLogic: event.target.checked })} /><span>Enable conditional logic</span></label><label className="form-choice"><input type="checkbox" checked={settings.storeSpamEntries} onChange={(event) => setSettings({ ...settings, storeSpamEntries: event.target.checked })} /><span>Keep flagged entries for review</span></label><label className="form-choice"><input type="checkbox" checked={settings.aiEnabled} onChange={(event) => setSettings({ ...settings, aiEnabled: event.target.checked })} /><span>AI-assisted classification hook (local-only placeholder)</span></label><div className="field"><label htmlFor="minimum-submit">Minimum completion time, seconds</label><input id="minimum-submit" type="number" min={0} max={600} value={settings.minimumSubmitSeconds} onChange={(event) => setSettings({ ...settings, minimumSubmitSeconds: Number(event.target.value) || 0 })} /></div><div className="field"><label htmlFor="captcha-provider">CAPTCHA provider</label><select id="captcha-provider" value={settings.captchaProvider} onChange={(event) => setSettings({ ...settings, captchaProvider: event.target.value as FormSettings["captchaProvider"] })}><option value="none">None</option><option value="built_in">Built-in hook</option><option value="recaptcha">reCAPTCHA adapter</option><option value="hcaptcha">hCaptcha adapter</option><option value="turnstile">Turnstile adapter</option><option value="custom">Custom adapter</option></select></div><div className="field"><label htmlFor="country-filter">Flag countries</label><input id="country-filter" value={settings.countryFilter.join(", ")} onChange={(event) => setSettings({ ...settings, countryFilter: commaList(event.target.value) })} placeholder="CN, RU" /></div><div className="field"><label htmlFor="keyword-filter">Flag keywords</label><input id="keyword-filter" value={settings.keywordFilter.join(", ")} onChange={(event) => setSettings({ ...settings, keywordFilter: commaList(event.target.value) })} placeholder="free money, casino" /></div></div></section><section className="panel builder-notifications-panel"><div className="panel-header"><div><span className="eyebrow">Notifications</span><h2 className="panel-title">Delivery rules</h2></div><button type="button" className="button button-secondary button-small" onClick={() => setNotifications((current) => [...current, { ...blankNotification(formId), sortOrder: current.length, name: `Notification ${current.length + 1}` }])}><Plus size={13} /> Add notification</button></div><div className="notice-banner builder-notice">Notifications are queued in the local delivery log. External email is intentionally disabled in this standalone workspace.</div><div className="builder-notifications-list">{notifications.map((notification) => <article className="builder-notification" key={notification.id}><div className="builder-notification-heading"><strong>{notification.name}</strong><label className="form-choice"><input type="checkbox" checked={notification.enabled} onChange={(event) => setNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, enabled: event.target.checked } : item))} /><span>Enabled</span></label><button type="button" className="icon-button icon-button-danger" aria-label={`Remove ${notification.name}`} disabled={notifications.length === 1} onClick={() => setNotifications((current) => current.filter((item) => item.id !== notification.id))}><Trash2 size={14} /></button></div><div className="form-row"><div className="field"><label>Name</label><input value={notification.name} onChange={(event) => setNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, name: event.target.value } : item))} /></div><div className="field"><label>Recipients</label><input value={notification.recipientEmails.join(", ")} onChange={(event) => setNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, recipientEmails: commaList(event.target.value) } : item))} placeholder="ops@example.test" /></div></div><div className="form-row"><div className="field"><label>Subject</label><input value={notification.subject} onChange={(event) => setNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, subject: event.target.value } : item))} /></div><div className="field"><label>Reply-to</label><input value={notification.replyTo} onChange={(event) => setNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, replyTo: event.target.value } : item))} /></div></div><div className="field"><label>Message HTML</label><textarea value={notification.messageHtml} onChange={(event) => setNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, messageHtml: event.target.value } : item))} rows={4} /></div><ConditionEditor conditional={notification.condition} fields={fields} onChange={(condition) => setNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, condition } : item))} /></article>)}</div></section><section className="panel builder-confirmation-panel"><div className="panel-header"><div><span className="eyebrow">After submit</span><h2 className="panel-title">Confirmation</h2></div></div><div className="form-grid"><div className="field"><label htmlFor="confirmation-type">Confirmation type</label><select id="confirmation-type" value={confirmation.confirmationType} onChange={(event) => setConfirmation({ ...confirmation, confirmationType: event.target.value as FormConfirmation["confirmationType"] })}><option value="message">Inline message</option><option value="page">Saved page</option><option value="url">Redirect URL</option></select></div>{confirmation.confirmationType === "page" ? <div className="field"><label htmlFor="confirmation-page">Page URL</label><input id="confirmation-page" value={confirmation.pageUrl} onChange={(event) => setConfirmation({ ...confirmation, pageUrl: event.target.value })} placeholder="/pages/thanks" /></div> : null}{confirmation.confirmationType === "url" ? <div className="field"><label htmlFor="confirmation-url">Redirect URL</label><input id="confirmation-url" value={confirmation.redirectUrl} onChange={(event) => setConfirmation({ ...confirmation, redirectUrl: event.target.value })} placeholder="https://example.test/thanks" /></div> : null}<div className="field"><label htmlFor="confirmation-message">Message HTML</label><textarea id="confirmation-message" value={confirmation.messageHtml} onChange={(event) => setConfirmation({ ...confirmation, messageHtml: event.target.value })} rows={4} /></div><label className="form-choice"><input type="checkbox" checked={confirmation.autoScroll} onChange={(event) => setConfirmation({ ...confirmation, autoScroll: event.target.checked })} /><span>Auto-scroll to confirmation</span></label><label className="form-choice"><input type="checkbox" checked={confirmation.entryPreview} onChange={(event) => setConfirmation({ ...confirmation, entryPreview: event.target.checked })} /><span>Show submitted values in the confirmation</span></label></div></section>{error ? <p className="form-error" role="alert">{error}</p> : null}{message ? <p className="form-success" role="status">{message}</p> : null}</section><aside className="form-builder-sidebar"><section className="panel page-block-library"><div className="panel-header"><div><span className="eyebrow">Field library</span><h2 className="panel-title">Add a field</h2></div><Plus size={16} color="#8b9995" /></div>{fieldGroups.map((group) => <div className="builder-field-group" key={group.label}><span className="builder-group-label">{group.label}</span>{group.types.map((item) => <button type="button" className="page-block-library-item" key={item.type} onClick={() => addField(item.type)}><span className="page-block-icon"><Plus size={14} /></span><span><strong>{item.label}</strong><small>{item.description}</small></span><ArrowRight size={14} /></button>)}</div>)}</section><section className="panel builder-help-panel"><div className="panel-header"><div><span className="eyebrow">Local-safe delivery</span><h2 className="panel-title">Mailer settings</h2></div></div><div className="empty-state"><p>Configure sender defaults and encrypted provider secrets in the mailer settings screen. No provider call is made by this demo.</p><Link className="panel-link" href="/admin/forms/mailer">Open mailer settings <ArrowRight size={13} /></Link></div></section></aside></div></form>;
}
