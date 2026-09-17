"use client";

import { Palette, Save, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { THEME_PRESETS, THEME_PRESET_OPTIONS, type ThemeFont, type ThemePresetName, type ThemeSettingsValues } from "@/lib/theme-presets";
import type { ThemeSettings } from "@/lib/types";

const fontOptions: Array<{ value: ThemeFont; label: string }> = [
  { value: "manrope", label: "Manrope" },
  { value: "dm-sans", label: "DM Sans" },
  { value: "montserrat", label: "Montserrat" },
  { value: "roboto", label: "Roboto" },
  { value: "karla", label: "Karla" },
  { value: "garamond", label: "Garamond" },
];

type FormState = ThemeSettingsValues;

export function ThemeSettingsForm({ settings }: { settings: ThemeSettings }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => ({
    preset: settings.preset,
    bodyStyle: settings.bodyStyle,
    contentWidth: settings.contentWidth,
    sectionSpacing: settings.sectionSpacing,
    shopLayout: settings.shopLayout,
    headingFont: settings.headingFont,
    bodyFont: settings.bodyFont,
    primaryColor: settings.primaryColor,
    accentColor: settings.accentColor,
    surfaceColor: settings.surfaceColor,
    surfaceRaisedColor: settings.surfaceRaisedColor,
    inkColor: settings.inkColor,
    inkSoftColor: settings.inkSoftColor,
    inkFaintColor: settings.inkFaintColor,
    lineColor: settings.lineColor,
    cardRadius: settings.cardRadius,
    buttonRadius: settings.buttonRadius,
  }));
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  function update<K extends keyof FormState>(name: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [name]: value, ...(name === "preset" ? {} : { preset: "custom" as const }) }));
  }

  function selectPreset(value: string) {
    if (value === "custom") {
      setForm((current) => ({ ...current, preset: "custom" }));
      return;
    }
    const preset = THEME_PRESETS[value as ThemePresetName];
    if (preset) setForm({ ...preset });
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/theme-settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "The theme settings could not be saved.");
      setMessage("Theme settings saved.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The theme settings could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="admin-form-card theme-settings-form" onSubmit={submit}>
      <div className="panel-header"><div><span className="eyebrow">Native visual system</span><h2>Theme and layout</h2><p className="form-help">These controls are part of the standalone application. Choose a starting skin, then adjust the layout, type, and palette without an external CMS or page-builder plugin.</p></div><Palette size={19} color="var(--teal)" /></div>
      <div className="theme-settings-layout">
        <div className="theme-settings-controls">
          <section className="settings-form-section" aria-labelledby="theme-preset-title">
            <h3 id="theme-preset-title">Starting skin</h3>
            <div className="field"><label htmlFor="theme-preset">Preset</label><select id="theme-preset" value={form.preset} onChange={(event) => selectPreset(event.target.value)}><option value="custom">Custom settings</option>{THEME_PRESET_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>
            <small>{form.preset === "custom" ? "Your current values are customized. Selecting a preset replaces the current visual values." : THEME_PRESET_OPTIONS.find((option) => option.value === form.preset)?.description}</small>
          </section>
          <section className="settings-form-section" aria-labelledby="theme-layout-title">
            <h3 id="theme-layout-title">Layout behavior</h3>
            <div className="form-row"><div className="field"><label htmlFor="theme-body-style">Body layout</label><select id="theme-body-style" value={form.bodyStyle} onChange={(event) => update("bodyStyle", event.target.value as FormState["bodyStyle"])}><option value="fullwide">Full width</option><option value="wide">Wide content</option><option value="boxed">Boxed canvas</option></select></div><div className="field"><label htmlFor="theme-content-width">Content width</label><input id="theme-content-width" type="number" min="960" max="1440" step="10" value={form.contentWidth} onChange={(event) => update("contentWidth", Number(event.target.value))} /></div></div>
            <div className="form-row"><div className="field"><label htmlFor="theme-section-spacing">Section spacing</label><select id="theme-section-spacing" value={form.sectionSpacing} onChange={(event) => update("sectionSpacing", event.target.value as FormState["sectionSpacing"])}><option value="none">None</option><option value="small">Small</option><option value="medium">Medium</option><option value="large">Large</option></select></div><div className="field"><label htmlFor="theme-shop-layout">Shop layout</label><select id="theme-shop-layout" value={form.shopLayout} onChange={(event) => update("shopLayout", event.target.value as FormState["shopLayout"])}><option value="grid">Product grid</option><option value="list">Product list</option></select></div></div>
          </section>
          <section className="settings-form-section" aria-labelledby="theme-type-title">
            <h3 id="theme-type-title">Typography</h3>
            <div className="form-row"><div className="field"><label htmlFor="theme-heading-font">Heading font</label><select id="theme-heading-font" value={form.headingFont} onChange={(event) => update("headingFont", event.target.value as ThemeFont)}>{fontOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div><div className="field"><label htmlFor="theme-body-font">Body font</label><select id="theme-body-font" value={form.bodyFont} onChange={(event) => update("bodyFont", event.target.value as ThemeFont)}>{fontOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div></div>
            <div className="form-row"><div className="field"><label htmlFor="theme-card-radius">Card radius</label><input id="theme-card-radius" type="number" min="0" max="32" value={form.cardRadius} onChange={(event) => update("cardRadius", Number(event.target.value))} /></div><div className="field"><label htmlFor="theme-button-radius">Button radius</label><input id="theme-button-radius" type="number" min="0" max="32" value={form.buttonRadius} onChange={(event) => update("buttonRadius", Number(event.target.value))} /></div></div>
          </section>
          <section className="settings-form-section" aria-labelledby="theme-color-title">
            <h3 id="theme-color-title">Color palette</h3>
            <div className="theme-color-grid">{([ ["primaryColor", "Primary"], ["accentColor", "Accent"], ["surfaceColor", "Page background"], ["surfaceRaisedColor", "Card background"], ["inkColor", "Main text"], ["inkSoftColor", "Secondary text"], ["inkFaintColor", "Quiet text"], ["lineColor", "Borders"] ] as Array<[keyof FormState, string]>).map(([name, label]) => <label className="theme-color-field" key={name}><span>{label}</span><input type="color" value={form[name] as string} onChange={(event) => update(name, event.target.value)} /><code>{form[name] as string}</code></label>)}</div>
          </section>
        </div>
        <aside className="theme-preview" style={{ "--preview-primary": form.primaryColor, "--preview-accent": form.accentColor, "--preview-surface": form.surfaceColor, "--preview-raised": form.surfaceRaisedColor, "--preview-ink": form.inkColor, "--preview-radius": `${form.cardRadius}px`, "--preview-button-radius": `${form.buttonRadius}px` } as React.CSSProperties}>
          <span className="eyebrow"><Sparkles size={12} /> Live preview</span>
          <div className="theme-preview-brand"><span className="theme-preview-mark" /><span>Client skin</span></div>
          <div className="theme-preview-hero"><small>Featured session</small><strong>Build a storefront that feels like yours.</strong><span>Typography, palette, spacing, and shape controls apply across the native shell.</span><button type="button">Explore sessions</button></div>
          <div className="theme-preview-card"><span className="theme-preview-card-line" /><strong>Product or session card</strong><small>Reusable blocks inherit the selected skin.</small></div>
        </aside>
      </div>
      {message ? <p className={message === "Theme settings saved." ? "form-success" : "form-error"} role={message === "Theme settings saved." ? "status" : "alert"}>{message}</p> : null}
      <div className="form-actions"><button className="button" type="submit" disabled={saving}><Save size={15} />{saving ? "Saving theme…" : "Save theme settings"}</button><span className="form-help">Changes apply to public and admin surfaces after the next render.</span></div>
    </form>
  );
}
