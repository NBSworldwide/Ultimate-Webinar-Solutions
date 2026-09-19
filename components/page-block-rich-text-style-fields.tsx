import { useState, type ReactNode } from "react";
import { AlignCenterHorizontal, AlignEndHorizontal, AlignStartHorizontal, AlignJustify, ChevronDown, Globe2, Monitor, Pencil, RotateCcw } from "lucide-react";
import type { PageBlockStyle, PageStyleDevice, PageStyleNumber, PageStyleUnit, PageStyleUnits } from "@/lib/types";

type TextUnitKey = "paragraphSpacing" | "verticalHeight" | "verticalLetterSpacing" | "verticalWordSpacing" | "verticalTextIndent" | "verticalLineHeight";
type TextNumberKey = "paragraphSpacing" | "letterSpacing" | "wordSpacing";
type VerticalNumberKey = "height" | "letterSpacing" | "wordSpacing" | "textIndent" | "lineHeight";

const unitOptions: Array<{ value: PageStyleUnit; label: string }> = [
  { value: "px", label: "px" },
  { value: "%", label: "%" },
  { value: "em", label: "em" },
  { value: "rem", label: "rem" },
  { value: "vw", label: "vw" },
];

const customUnitKeys: Record<TextUnitKey, keyof PageStyleUnits> = {
  paragraphSpacing: "paragraphSpacingCustom",
  verticalHeight: "verticalHeightCustom",
  verticalLetterSpacing: "verticalLetterSpacingCustom",
  verticalWordSpacing: "verticalWordSpacingCustom",
  verticalTextIndent: "verticalTextIndentCustom",
  verticalLineHeight: "verticalLineHeightCustom",
};

function numberText(value: number | undefined): string {
  return value === undefined ? "" : String(value);
}

function colorText(value: string | undefined, fallback: string): string {
  return value && /^#[0-9a-f]{3,8}$/i.test(value) ? value : fallback;
}

function responsiveValue(values: PageStyleNumber | undefined, device: PageStyleDevice, fallback = 0): number {
  return values?.[device] ?? values?.desktop ?? fallback;
}

function UnitSelect({ value, customValue, onChange }: {
  value: PageStyleUnit;
  customValue?: string;
  onChange: (value: PageStyleUnit, customValue?: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const displayValue = value === "custom" ? customValue || "custom" : value;
  return <div className="page-style-unit-select">
    <button type="button" className="page-style-unit-trigger" aria-haspopup="listbox" aria-expanded={open} aria-label={`Unit: ${displayValue}`} onClick={() => setOpen((current) => !current)}><span>{displayValue}</span><ChevronDown size={12} aria-hidden="true" /></button>
    {open ? <div className="page-style-unit-menu" role="listbox" aria-label="Unit options">
      {unitOptions.map((option) => <button type="button" role="option" aria-selected={value === option.value} className={value === option.value ? "is-active" : ""} key={option.value} onClick={() => { onChange(option.value); setOpen(false); }}>{option.label}</button>)}
      <button type="button" role="option" aria-selected={value === "custom"} className={`page-style-unit-custom ${value === "custom" ? "is-active" : ""}`} aria-label="Custom unit" title="Custom unit" onClick={() => { onChange("custom", customValue ?? ""); setOpen(false); }}><Pencil size={14} aria-hidden="true" /></button>
      {value === "custom" ? <input aria-label="Custom unit value" autoFocus value={customValue ?? ""} placeholder="unit" onClick={(event) => event.stopPropagation()} onChange={(event) => onChange("custom", event.target.value)} /> : null}
    </div> : null}
  </div>;
}

function FieldHeading({ label, children }: { label: string; children?: ReactNode }) {
  return <div className="page-style-rich-heading"><span>{label}</span><span className="page-style-rich-meta">{children}</span></div>;
}

function EditButton({ label, open, onClick }: { label: string; open: boolean; onClick: () => void }) {
  return <button type="button" className={`page-style-rich-edit ${open ? "is-active" : ""}`} aria-label={`${open ? "Close" : "Edit"} ${label}`} aria-expanded={open} title={`${open ? "Close" : "Edit"} ${label}`} onClick={onClick}><Pencil size={14} aria-hidden="true" /></button>;
}

function IconGroup<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: Array<{ value: T; label: string; icon: ReactNode }>; onChange: (value: T) => void }) {
  return <div className="page-style-rich-row"><FieldHeading label={label}><Monitor size={14} aria-hidden="true" /></FieldHeading><div className="page-style-icon-button-group" role="group" aria-label={label}>{options.map((option) => <button type="button" key={option.value} className={value === option.value ? "is-active" : ""} aria-label={option.label} title={option.label} onClick={() => onChange(option.value)}>{option.icon}</button>)}</div></div>;
}

function ToggleButton({ value, onChange }: { value: boolean; onChange: (value: boolean) => void }) {
  return <button type="button" className={`page-style-switch ${value ? "is-active" : ""}`} aria-pressed={value} onClick={() => onChange(!value)}>{value ? "Yes" : "No"}</button>;
}

function SliderField({ label, value, min, max, step, unit, onChange }: { label: string; value: string; min: number; max: number; step: number; unit?: ReactNode; onChange: (value: string) => void }) {
  const numericValue = Number(value);
  const sliderValue = Number.isFinite(numericValue) ? numericValue : min;
  return <div className="page-style-rich-slider-field"><FieldHeading label={label}>{unit}<Monitor size={14} aria-hidden="true" /></FieldHeading><div className="page-style-rich-slider-controls"><input aria-label={`${label} slider`} type="range" min={min} max={max} step={step} value={sliderValue} onChange={(event) => onChange(event.target.value)} /><input aria-label={label} type="number" min={min} max={max} step={step} value={value} onChange={(event) => onChange(event.target.value)} /></div></div>;
}

export function PageBlockRichTextStyleFields({ style, device, onChange }: { style: PageBlockStyle; device: PageStyleDevice; onChange: (style: PageBlockStyle) => void }) {
  const [editing, setEditing] = useState<"typography" | "shadow" | null>(null);
  const [colorState, setColorState] = useState<"normal" | "hover">("normal");
  const typography = style.typography ?? {};
  const verticalText = style.verticalText ?? {};

  function updateTypography(patch: Partial<NonNullable<PageBlockStyle["typography"]>>) {
    onChange({ ...style, typography: { ...typography, ...patch } });
  }

  function updateTypographyNumber(key: TextNumberKey, raw: string, min: number, max: number) {
    const value = raw === "" ? undefined : Math.min(max, Math.max(min, Number(raw)));
    const values = { ...((typography[key] as PageStyleNumber | undefined) ?? {}) };
    if (value === undefined || !Number.isFinite(value)) delete values[device]; else values[device] = value;
    updateTypography({ [key]: Object.keys(values).length > 0 ? values : undefined });
  }

  function updateVertical(patch: Partial<NonNullable<PageBlockStyle["verticalText"]>>) {
    onChange({ ...style, verticalText: { ...verticalText, ...patch } });
  }

  function updateVerticalNumber(key: VerticalNumberKey, raw: string, min: number, max: number) {
    const value = raw === "" ? undefined : Math.min(max, Math.max(min, Number(raw)));
    const values = { ...((verticalText[key] as PageStyleNumber | undefined) ?? {}) };
    if (value === undefined || !Number.isFinite(value)) delete values[device]; else values[device] = value;
    updateVertical({ [key]: Object.keys(values).length > 0 ? values : undefined });
  }

  function textUnit(key: TextUnitKey): PageStyleUnit {
    return style.units?.[key]?.[device] ?? style.units?.[key]?.desktop ?? "px";
  }

  function textCustomUnit(key: TextUnitKey): string {
    const customKey = customUnitKeys[key];
    return style.units?.[customKey]?.[device] ?? style.units?.[customKey]?.desktop ?? "";
  }

  function updateTextUnit(key: TextUnitKey, value: PageStyleUnit, customValue?: string) {
    const currentUnits = style.units ?? {};
    const unitValues: Partial<Record<PageStyleDevice, PageStyleUnit>> = { ...((currentUnits[key] as Partial<Record<PageStyleDevice, PageStyleUnit>> | undefined) ?? {}), [device]: value };
    const nextUnits: PageStyleUnits = { ...currentUnits, [key]: unitValues };
    if (value === "custom" && customValue !== undefined) {
      const customKey = customUnitKeys[key];
      const customValues: Partial<Record<PageStyleDevice, string>> = { ...((currentUnits[customKey] as Partial<Record<PageStyleDevice, string>> | undefined) ?? {}), [device]: customValue };
      Object.assign(nextUnits, { [customKey]: customValues });
    }
    onChange({ ...style, units: nextUnits });
  }

  function updateColor(kind: "textColor" | "linkColor", value: string) {
    if (colorState === "normal") updateTypography({ [kind]: value });
    else onChange({ ...style, hover: { ...style.hover, textColor: value } });
  }

  const alignmentOptions = [
    { value: "left" as const, label: "Left", icon: <AlignStartHorizontal size={16} /> },
    { value: "center" as const, label: "Center", icon: <AlignCenterHorizontal size={16} /> },
    { value: "right" as const, label: "Right", icon: <AlignEndHorizontal size={16} /> },
    { value: "justify" as const, label: "Justify", icon: <AlignJustify size={16} /> },
  ];

  return <>
    <details className="page-style-group page-style-rich-text-group" name="page-style-accordion" open>
      <summary>Text Editor</summary>
      <div className="page-style-rich-body">
        <IconGroup label="Alignment" value={typography.textAlign ?? "left"} options={alignmentOptions} onChange={(value) => updateTypography({ textAlign: value })} />
        <div className="page-style-rich-divider" />
        <div className="page-style-rich-row"><FieldHeading label="Typography"><Globe2 size={14} aria-hidden="true" /></FieldHeading><EditButton label="Typography" open={editing === "typography"} onClick={() => setEditing((current) => current === "typography" ? null : "typography")} /></div>
        {editing === "typography" ? <div className="page-style-rich-editor-fields"><label className="field"><span>Font family</span><select value={typography.fontFamily ?? "default"} onChange={(event) => updateTypography({ fontFamily: event.target.value as NonNullable<PageBlockStyle["typography"]>["fontFamily"] })}><option value="default">Global default</option><option value="Manrope">Manrope</option><option value="DM Mono">DM Mono</option><option value="Inter">Inter</option><option value="Arial">Arial</option><option value="Georgia">Georgia</option><option value="Verdana">Verdana</option></select></label><label className="field"><span>Font size</span><input type="number" min="8" max="160" value={numberText(responsiveValue(typography.fontSize, device))} onChange={(event) => { const value = event.target.value === "" ? undefined : Number(event.target.value); const values = { ...(typography.fontSize ?? {}) }; if (value === undefined || !Number.isFinite(value)) delete values[device]; else values[device] = value; updateTypography({ fontSize: Object.keys(values).length > 0 ? values : undefined }); }} /></label><label className="field"><span>Weight</span><select value={typography.fontWeight ? String(typography.fontWeight) : ""} onChange={(event) => updateTypography({ fontWeight: event.target.value ? Number(event.target.value) : undefined })}><option value="">Global default</option>{[300, 400, 500, 600, 700, 800].map((weight) => <option value={weight} key={weight}>{weight}</option>)}</select></label><label className="field"><span>Transform</span><select value={typography.textTransform ?? "none"} onChange={(event) => updateTypography({ textTransform: event.target.value as NonNullable<PageBlockStyle["typography"]>["textTransform"] })}><option value="none">None</option><option value="uppercase">Uppercase</option><option value="lowercase">Lowercase</option><option value="capitalize">Capitalize</option></select></label></div> : null}
        <div className="page-style-rich-row"><FieldHeading label="Text Shadow"><Globe2 size={14} aria-hidden="true" /></FieldHeading><EditButton label="Text shadow" open={editing === "shadow"} onClick={() => setEditing((current) => current === "shadow" ? null : "shadow")} /></div>
        {editing === "shadow" ? <div className="page-style-rich-editor-fields"><label className="page-style-color"><span>Color</span><input type="color" value={colorText(typography.textShadow?.color, "#183b36")} onChange={(event) => updateTypography({ textShadow: { ...typography.textShadow, color: event.target.value } })} /></label><SliderField label="Horizontal" value={numberText(responsiveValue(typography.textShadow?.horizontal, device))} min={-200} max={200} step={1} onChange={(value) => { const values = { ...(typography.textShadow?.horizontal ?? {}) }; values[device] = Number(value); updateTypography({ textShadow: { ...typography.textShadow, horizontal: values } }); }} /><SliderField label="Vertical" value={numberText(responsiveValue(typography.textShadow?.vertical, device))} min={-200} max={200} step={1} onChange={(value) => { const values = { ...(typography.textShadow?.vertical ?? {}) }; values[device] = Number(value); updateTypography({ textShadow: { ...typography.textShadow, vertical: values } }); }} /><SliderField label="Blur" value={numberText(responsiveValue(typography.textShadow?.blur, device))} min={0} max={300} step={1} onChange={(value) => { const values = { ...(typography.textShadow?.blur ?? {}) }; values[device] = Number(value); updateTypography({ textShadow: { ...typography.textShadow, blur: values } }); }} /></div> : null}
        <SliderField label="Paragraph Spacing" value={numberText(responsiveValue(typography.paragraphSpacing, device))} min={0} max={120} step={1} unit={<UnitSelect value={textUnit("paragraphSpacing")} customValue={textCustomUnit("paragraphSpacing")} onChange={(value, customValue) => updateTextUnit("paragraphSpacing", value, customValue)} />} onChange={(value) => updateTypographyNumber("paragraphSpacing", value, 0, 120)} />
        <div className="page-style-rich-divider" />
        <div className="page-style-rich-tabs" role="tablist" aria-label="Text state"><button type="button" className={colorState === "normal" ? "is-active" : ""} role="tab" aria-selected={colorState === "normal"} onClick={() => setColorState("normal")}>Normal</button><button type="button" className={colorState === "hover" ? "is-active" : ""} role="tab" aria-selected={colorState === "hover"} onClick={() => setColorState("hover")}>Hover</button></div>
        <div className="page-style-rich-color-row"><FieldHeading label="Text Color"><Globe2 size={14} aria-hidden="true" /></FieldHeading><input type="color" value={colorText(colorState === "normal" ? typography.textColor : style.hover?.textColor, "#52615e")} onChange={(event) => updateColor("textColor", event.target.value)} /></div>
        <div className="page-style-rich-color-row"><FieldHeading label="Link Color"><Globe2 size={14} aria-hidden="true" /></FieldHeading><input type="color" value={colorText(colorState === "normal" ? typography.linkColor : style.hover?.textColor, "#0f776e")} onChange={(event) => updateColor("linkColor", event.target.value)} /></div>
      </div>
    </details>

    <details className="page-style-group page-style-rich-text-group" name="page-style-accordion">
      <summary>Vertical Text Orientation</summary>
      <div className="page-style-rich-body">
        <div className="page-style-rich-row"><FieldHeading label="Enable vertical text"><Monitor size={14} aria-hidden="true" /></FieldHeading><ToggleButton value={verticalText.enabled ?? false} onChange={(value) => updateVertical({ enabled: value })} /></div>
        <div className="page-style-rich-row"><FieldHeading label="Writing mode" /><select value={verticalText.writingMode ?? "vertical-rl"} onChange={(event) => updateVertical({ writingMode: event.target.value as "vertical-rl" | "vertical-lr" })}><option value="vertical-rl">Vertical RL</option><option value="vertical-lr">Vertical LR</option></select></div>
        <div className="page-style-rich-row"><FieldHeading label="Flip"><Monitor size={14} aria-hidden="true" /></FieldHeading><ToggleButton value={verticalText.flip ?? false} onChange={(value) => updateVertical({ flip: value })} /></div>
        <SliderField label="Height" value={numberText(responsiveValue(verticalText.height, device))} min={0} max={2_000} step={1} unit={<UnitSelect value={textUnit("verticalHeight")} customValue={textCustomUnit("verticalHeight")} onChange={(value, customValue) => updateTextUnit("verticalHeight", value, customValue)} />} onChange={(value) => updateVerticalNumber("height", value, 0, 2_000)} />
        <div className="page-style-rich-row"><FieldHeading label="Upright Orientation"><Monitor size={14} aria-hidden="true" /></FieldHeading><ToggleButton value={verticalText.upright ?? false} onChange={(value) => updateVertical({ upright: value })} /></div>
        <SliderField label="Letter Spacing" value={numberText(responsiveValue(verticalText.letterSpacing, device))} min={-20} max={80} step={1} unit={<UnitSelect value={textUnit("verticalLetterSpacing")} customValue={textCustomUnit("verticalLetterSpacing")} onChange={(value, customValue) => updateTextUnit("verticalLetterSpacing", value, customValue)} />} onChange={(value) => updateVerticalNumber("letterSpacing", value, -20, 80)} />
        <SliderField label="Word Spacing" value={numberText(responsiveValue(verticalText.wordSpacing, device))} min={-20} max={120} step={1} unit={<UnitSelect value={textUnit("verticalWordSpacing")} customValue={textCustomUnit("verticalWordSpacing")} onChange={(value, customValue) => updateTextUnit("verticalWordSpacing", value, customValue)} />} onChange={(value) => updateVerticalNumber("wordSpacing", value, -20, 120)} />
        <SliderField label="Text Indent" value={numberText(responsiveValue(verticalText.textIndent, device))} min={-300} max={300} step={1} unit={<UnitSelect value={textUnit("verticalTextIndent")} customValue={textCustomUnit("verticalTextIndent")} onChange={(value, customValue) => updateTextUnit("verticalTextIndent", value, customValue)} />} onChange={(value) => updateVerticalNumber("textIndent", value, -300, 300)} />
        <SliderField label="Line Height" value={numberText(responsiveValue(verticalText.lineHeight, device, 1.5))} min={0.5} max={4} step={0.05} unit={<UnitSelect value={textUnit("verticalLineHeight")} customValue={textCustomUnit("verticalLineHeight")} onChange={(value, customValue) => updateTextUnit("verticalLineHeight", value, customValue)} />} onChange={(value) => updateVerticalNumber("lineHeight", value, 0.5, 4)} />
        <div className="page-style-rich-divider" />
        <label className="field"><span>Styling options</span><select value={verticalText.style ?? "normal"} onChange={(event) => updateVertical({ style: event.target.value as "normal" | "upright" })}><option value="normal">Normal type</option><option value="upright">Upright type</option></select></label>
        <button type="button" className="page-style-rich-reset" onClick={() => onChange({ ...style, verticalText: undefined })}><RotateCcw size={13} aria-hidden="true" /> Reset vertical text</button>
      </div>
    </details>
  </>;
}
