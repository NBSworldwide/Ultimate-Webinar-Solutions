"use client";

import { useMemo, useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import type { FormConfirmation, FormDefinition, FormField } from "@/lib/types";

type FormValue = string | string[];
type FormValues = Record<string, FormValue>;

function stringValue(value: FormValue | undefined): string {
  return Array.isArray(value) ? value.join(", ") : value ?? "";
}

function matchesCondition(field: FormField, values: FormValues): boolean {
  if (!field.conditional) return true;
  const current = stringValue(values[field.conditional.fieldId]).trim();
  const expected = field.conditional.value.trim();
  if (field.conditional.operator === "not_empty") return current.length > 0;
  if (field.conditional.operator === "contains") return current.toLowerCase().includes(expected.toLowerCase());
  if (field.conditional.operator === "not_equals") return current.toLowerCase() !== expected.toLowerCase();
  return current.toLowerCase() === expected.toLowerCase();
}

function splitIntoSteps(fields: FormField[]): FormField[][] {
  const groups: FormField[][] = [[]];
  for (const field of fields) {
    if (field.fieldType === "page_break") {
      if (groups[groups.length - 1]?.length) groups.push([]);
    } else {
      groups[groups.length - 1]?.push(field);
    }
  }
  const nonEmpty = groups.filter((group) => group.length > 0);
  return nonEmpty.length > 0 ? nonEmpty : [[]];
}

function initialValues(form: FormDefinition): FormValues {
  return Object.fromEntries(form.fields.filter((field) => !["layout", "page_break", "divider", "rich_text", "html"].includes(field.fieldType) && field.defaultValue).map((field) => [field.fieldId, field.fieldType === "checkbox" ? field.defaultValue.split(",").map((value) => value.trim()).filter(Boolean) : field.defaultValue]));
}

function ControlDescription({ field }: { field: FormField }) {
  return field.description ? <small className="form-field-description">{field.description}</small> : null;
}

function ChoiceOption({ field, option, checked, onChange }: { field: FormField; option: { label: string; value: string }; checked: boolean; onChange: (event: ChangeEvent<HTMLInputElement>) => void }) {
  return <label className="form-choice"><input type={field.fieldType === "radio" ? "radio" : "checkbox"} name={field.fieldType === "radio" ? field.fieldId : `${field.fieldId}-${option.value}`} value={option.value} checked={checked} onChange={onChange} /><span>{option.label}</span></label>;
}

function FormFieldControl({ field, value, onChange }: { field: FormField; value: FormValue | undefined; onChange: (value: FormValue) => void }) {
  const id = `field-${field.fieldId}`;
  const text = stringValue(value);
  const options = field.options.length > 0 ? field.options : [{ label: "Option one", value: "option-one" }, { label: "Option two", value: "option-two" }];
  const updateText = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => onChange(event.target.value);
  if (field.fieldType === "hidden") return <input type="hidden" id={id} name={field.fieldId} value={text} onChange={updateText} />;
  if (field.fieldType === "layout") return <div className="form-layout-heading"><strong>{field.label}</strong><ControlDescription field={field} /></div>;
  if (field.fieldType === "divider") return <div className="form-divider" aria-hidden="true"><span>{field.label}</span></div>;
  if (field.fieldType === "rich_text" || field.fieldType === "html") return <div className="form-rich-content" dangerouslySetInnerHTML={{ __html: String(field.settings.content ?? "") }} />;
  if (field.fieldType === "select") return <><label htmlFor={id}>{field.label}{field.isRequired ? <span className="required-mark">*</span> : null}</label><select id={id} name={field.fieldId} value={text} onChange={updateText} required={field.isRequired}><option value="">{field.placeholder || "Choose an option"}</option>{options.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select><ControlDescription field={field} /></>;
  if (field.fieldType === "radio" || field.fieldType === "checkbox") {
    const selected = Array.isArray(value) ? value : text ? [text] : [];
    return <fieldset className="form-choice-group"><legend>{field.label}{field.isRequired ? <span className="required-mark">*</span> : null}</legend>{options.map((option) => <ChoiceOption key={option.value} field={field} option={option} checked={selected.includes(option.value)} onChange={(event) => { if (field.fieldType === "radio") onChange(event.target.value); else onChange(event.target.checked ? [...selected, event.target.value] : selected.filter((item) => item !== event.target.value)); }} />)}<ControlDescription field={field} /></fieldset>;
  }
  if (field.fieldType === "range") return <><label htmlFor={id}>{field.label}{field.isRequired ? <span className="required-mark">*</span> : null}</label><input id={id} name={field.fieldId} type="range" min={typeof field.validation.min === "number" ? field.validation.min : 0} max={typeof field.validation.max === "number" ? field.validation.max : 10} step="1" value={text || 0} onChange={updateText} required={field.isRequired} /><output className="range-output" htmlFor={id}>{text || 0}</output><ControlDescription field={field} /></>;
  if (field.fieldType === "consent") return <><label className="form-choice form-consent"><input id={id} name={field.fieldId} type="checkbox" checked={text === "true"} onChange={(event) => onChange(event.target.checked ? "true" : "")} required={field.isRequired} /><span>{field.label}{field.isRequired ? <span className="required-mark">*</span> : null}</span></label><ControlDescription field={field} /></>;
  const inputType = field.fieldType === "email" ? "email" : field.fieldType === "number" ? "number" : field.fieldType === "datetime" ? "datetime-local" : field.fieldType === "url" ? "url" : field.fieldType === "phone" ? "tel" : field.fieldType === "captcha" ? "text" : "text";
  if (field.fieldType === "textarea" || field.fieldType === "address") return <><label htmlFor={id}>{field.label}{field.isRequired ? <span className="required-mark">*</span> : null}</label><textarea id={id} name={field.fieldId} value={text} onChange={updateText} placeholder={field.placeholder} required={field.isRequired} rows={field.fieldType === "address" ? 3 : 5} /><ControlDescription field={field} /></>;
  return <><label htmlFor={id}>{field.label}{field.isRequired ? <span className="required-mark">*</span> : null}</label><input id={id} name={field.fieldId} type={inputType} value={text} onChange={updateText} placeholder={field.placeholder} required={field.isRequired} min={typeof field.validation.min === "number" ? field.validation.min : undefined} max={typeof field.validation.max === "number" ? field.validation.max : undefined} /><ControlDescription field={field} /></>;
}

function ConfirmationView({ confirmation, values, labels }: { confirmation: FormConfirmation; values: FormValues; labels: Record<string, string> }) {
  return <section className="form-confirmation" role="status"><span className="eyebrow">Response received</span><div className="form-rich-content" dangerouslySetInnerHTML={{ __html: confirmation.messageHtml }} />{confirmation.entryPreview ? <dl className="form-entry-preview">{Object.entries(values).map(([key, value]) => <div key={key}><dt>{labels[key] ?? key}</dt><dd>{Array.isArray(value) ? value.join(", ") : value}</dd></div>)}</dl> : null}</section>;
}

export function FormRenderer({ form }: { form: FormDefinition }) {
  const router = useRouter();
  const steps = useMemo(() => splitIntoSteps(form.fields), [form.fields]);
  const labels = useMemo(() => Object.fromEntries(form.fields.map((field) => [field.fieldId, field.label])), [form.fields]);
  const [values, setValues] = useState<FormValues>(() => initialValues(form));
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState<FormConfirmation | null>(null);
  const [startedAt] = useState(() => Date.now());
  const currentFields = steps[step] ?? [];
  const finalStep = step >= steps.length - 1;

  const setFieldValue = (fieldId: string, value: FormValue) => setValues((current) => ({ ...current, [fieldId]: value }));

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!finalStep) {
      setStep((current) => current + 1);
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(`/api/forms/${encodeURIComponent(form.slug)}/submit`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ values, startedAt }) });
      const body = await response.json() as { error?: string; result?: { confirmation: FormConfirmation; values: FormValues } };
      if (!response.ok || !body.result) throw new Error(body.error || "The form could not be submitted.");
      const nextConfirmation = body.result.confirmation;
      if (nextConfirmation.confirmationType === "page" && nextConfirmation.pageUrl) {
        if (nextConfirmation.pageUrl.startsWith("/")) router.push(nextConfirmation.pageUrl);
        else window.location.assign(nextConfirmation.pageUrl);
        return;
      }
      if (nextConfirmation.confirmationType === "url" && nextConfirmation.redirectUrl) {
        if (nextConfirmation.redirectUrl.startsWith("/")) router.push(nextConfirmation.redirectUrl);
        else window.location.assign(nextConfirmation.redirectUrl);
        return;
      }
      setConfirmation(nextConfirmation);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "The form could not be submitted.");
    } finally {
      setSaving(false);
    }
  }

  if (confirmation) return <ConfirmationView confirmation={confirmation} values={values} labels={labels} />;
  return <form className="public-form" onSubmit={submit} noValidate><div className="public-form-header"><span className="eyebrow">Secure response form</span><h2>{form.name}</h2>{form.description ? <p>{form.description}</p> : null}</div><div className="public-form-fields">{currentFields.filter((field) => matchesCondition(field, values)).map((field) => <div className={`form-field form-field-${field.fieldType}`} key={field.id}><FormFieldControl field={field} value={values[field.fieldId]} onChange={(value) => setFieldValue(field.fieldId, value)} /></div>)}</div>{steps.length > 1 ? <div className="form-step-meta"><span>Step {step + 1} of {steps.length}</span><span className="form-step-progress"><span style={{ width: `${((step + 1) / steps.length) * 100}%` }} /></span></div> : null}{error ? <p className="form-error" role="alert">{error}</p> : null}<div className="public-form-actions">{step > 0 ? <button className="button button-secondary" type="button" onClick={() => setStep((current) => current - 1)}>Back</button> : null}<button className="button" type="submit" disabled={saving}>{saving ? form.submittingText : finalStep ? form.submitButtonText : "Continue"}</button></div></form>;
}
