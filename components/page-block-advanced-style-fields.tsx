import { useState, type ReactNode } from "react";
import {
  AlignCenterHorizontal,
  AlignEndHorizontal,
  AlignStartHorizontal,
  ArrowDown,
  ArrowUp,
  Ban,
  ChevronsLeftRight,
  ChevronDown,
  EllipsisVertical,
  Link2,
  Maximize2,
  Minimize2,
  Monitor,
  Paintbrush,
  Pencil,
  StretchHorizontal,
} from "lucide-react";
import type { PageBlockMotion, PageBlockStyle, PageBlockTransformValues, PageStyleBox, PageStyleDevice, PageStyleEdges, PageStyleNumber, PageStyleUnit } from "@/lib/types";

type EdgeGroup = "margin" | "padding" | "borderRadius";
type TransformMode = "normal" | "hover";
type TransformNumberKey = "rotate" | "offsetX" | "offsetY" | "scale" | "skewX" | "skewY";

const edgeNames: Array<{ key: keyof PageStyleEdges; label: string }> = [
  { key: "top", label: "Top" },
  { key: "right", label: "Right" },
  { key: "bottom", label: "Bottom" },
  { key: "left", label: "Left" },
];

const responsiveDevices: Array<[string, string]> = [
  ["widescreen", "Widescreen"],
  ["desktop", "Desktop"],
  ["laptop", "Laptop"],
  ["tabletLandscape", "Tablet landscape"],
  ["tabletPortrait", "Tablet portrait"],
  ["mobileLandscape", "Mobile landscape"],
  ["mobilePortrait", "Mobile portrait"],
];

function numberText(value: number | undefined): string {
  return value === undefined ? "" : String(value);
}

function boundedNumber(raw: string, min: number, max: number): number | undefined {
  if (raw === "") return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : undefined;
}

function NumberField({ label, value, onChange, min, max, step = 1, unit = "px" }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}) {
  return <label className="page-style-number page-style-advanced-number">
    <span>{label}</span>
    <span className="page-style-number-input">
      <input type="number" value={value} min={min} max={max} step={step} onChange={(event) => onChange(event.target.value)} />
      {unit ? <small>{unit}</small> : null}
    </span>
  </label>;
}

const unitOptions: Array<{ value: PageStyleUnit; label: string }> = [
  { value: "px", label: "px" },
  { value: "%", label: "%" },
  { value: "em", label: "em" },
  { value: "rem", label: "rem" },
  { value: "vw", label: "vw" },
];

function UnitSelect({ value, customValue, onChange }: {
  value: PageStyleUnit;
  customValue?: string;
  onChange: (value: PageStyleUnit, customValue?: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const displayValue = value === "custom" ? customValue || "custom" : value;
  return <div className="page-style-unit-select">
    <button type="button" className="page-style-unit-trigger" aria-haspopup="listbox" aria-expanded={open} aria-label={`Unit: ${displayValue}`} onClick={() => setOpen((current) => !current)}>
      <span>{displayValue}</span><ChevronDown size={12} aria-hidden="true" />
    </button>
    {open ? <div className="page-style-unit-menu" role="listbox" aria-label="Unit options">
      {unitOptions.map((option) => <button type="button" role="option" aria-selected={value === option.value} className={value === option.value ? "is-active" : ""} key={option.value} onClick={() => { onChange(option.value); setOpen(false); }}>{option.label}</button>)}
      <button type="button" role="option" aria-selected={value === "custom"} className={`page-style-unit-custom ${value === "custom" ? "is-active" : ""}`} aria-label="Custom unit" title="Custom unit" onClick={() => onChange("custom", customValue ?? "")}><Pencil size={14} aria-hidden="true" /></button>
      {value === "custom" ? <input aria-label="Custom unit value" autoFocus value={customValue ?? ""} placeholder="unit" onClick={(event) => event.stopPropagation()} onChange={(event) => onChange("custom", event.target.value)} /> : null}
    </div> : null}
  </div>;
}

function FieldHeading({ label, unit, children }: { label: string; unit?: ReactNode; children?: ReactNode }) {
  return <div className="page-style-advanced-field-heading">
    <span>{label}</span>
    <span className="page-style-advanced-field-meta"><Monitor size={14} aria-hidden="true" />{unit ? typeof unit === "string" ? <small>{unit}</small> : unit : null}{children}</span>
  </div>;
}

function SegmentedControl<T extends string>({ label, value, options, onChange }: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string; icon: ReactNode }>;
  onChange: (value: T) => void;
}) {
  return <div className="page-style-advanced-row">
    <FieldHeading label={label} unit="" />
    <div className="page-style-segmented-control" role="group" aria-label={label}>
      {options.map((option) => <button type="button" key={option.value} className={value === option.value ? "is-active" : ""} aria-label={option.label} title={option.label} onClick={() => onChange(option.value)}>{option.icon}</button>)}
    </div>
  </div>;
}

function EdgeControl({ title, group, device, linked, onToggleLink, edgeValue, setEdges, unit, customUnit, onChangeUnit }: {
  title: string;
  group: EdgeGroup;
  device: PageStyleDevice;
  linked: boolean;
  onToggleLink: () => void;
  edgeValue: (group: EdgeGroup, edge: keyof PageStyleEdges) => string;
  setEdges: (group: EdgeGroup, edge: keyof PageStyleEdges, value: string) => void;
  unit: PageStyleUnit;
  customUnit?: string;
  onChangeUnit: (value: PageStyleUnit, customValue?: string) => void;
}) {
  return <div className="page-style-advanced-edge">
    <FieldHeading label={title} unit={<UnitSelect value={unit} customValue={customUnit} onChange={onChangeUnit} />} />
    <div className="page-style-advanced-edge-grid">
      {edgeNames.map(({ key }) => <input key={key} aria-label={`${title} ${key}`} type="number" min={group === "margin" ? -500 : 0} max={group === "borderRadius" ? 300 : 500} value={edgeValue(group, key)} onChange={(event) => setEdges(group, key, event.target.value)} />)}
      <button type="button" className={`page-style-link-toggle page-style-advanced-link ${linked ? "is-active" : ""}`} aria-pressed={linked} aria-label={`${linked ? "Unlink" : "Link"} ${title.toLowerCase()} values`} title={`${linked ? "Unlink" : "Link"} values`} onClick={onToggleLink}><Link2 size={14} aria-hidden="true" /></button>
    </div>
    <div className="page-style-advanced-edge-labels" aria-hidden="true">{edgeNames.map(({ key, label }) => <span key={key}>{label}</span>)}</div>
  </div>;
}

export function PageBlockAdvancedStyleFields({ style, onChange, hiddenDevices, onToggleResponsive, layoutFooter }: {
  style: PageBlockStyle;
  onChange: (style: PageBlockStyle) => void;
  hiddenDevices: Set<string>;
  onToggleResponsive: (device: string, checked: boolean) => void;
  layoutFooter?: ReactNode;
}) {
  const [device] = useState<PageStyleDevice>("desktop");
  const [linkedEdges, setLinkedEdges] = useState<Record<EdgeGroup, boolean>>({ margin: false, padding: false, borderRadius: false });
  const [transformMode, setTransformMode] = useState<TransformMode>("normal");
  const [editingTransform, setEditingTransform] = useState<string | null>(null);
  const transform = style.transform?.[transformMode] ?? {};

  function update(next: PageBlockStyle) {
    onChange(next);
  }

  function edgeSource(group: EdgeGroup): PageStyleBox | undefined {
    if (group === "margin") return style.margin;
    if (group === "padding") return style.padding;
    return style.border?.radius;
  }

  function edgeValue(group: EdgeGroup, edge: keyof PageStyleEdges): string {
    const values = edgeSource(group);
    return numberText(values?.[device]?.[edge] ?? values?.desktop?.[edge]);
  }

  const customUnitKeys: Record<EdgeGroup, "marginCustom" | "paddingCustom" | "borderRadiusCustom"> = {
    margin: "marginCustom",
    padding: "paddingCustom",
    borderRadius: "borderRadiusCustom",
  };

  function edgeUnit(group: EdgeGroup): PageStyleUnit {
    return style.units?.[group]?.[device] ?? style.units?.[group]?.desktop ?? "px";
  }

  function edgeCustomUnit(group: EdgeGroup): string {
    const key = customUnitKeys[group];
    return style.units?.[key]?.[device] ?? style.units?.[key]?.desktop ?? "";
  }

  function setEdgeUnit(group: EdgeGroup, unit: PageStyleUnit, customValue?: string) {
    const currentUnits = style.units ?? {};
    const unitValues = { ...(currentUnits[group] ?? {}) };
    unitValues[device] = unit;
    const nextUnits: NonNullable<PageBlockStyle["units"]> = { ...currentUnits, [group]: unitValues };
    if (unit === "custom" && customValue !== undefined) {
      const customKey = customUnitKeys[group];
      nextUnits[customKey] = { ...(currentUnits[customKey] ?? {}), [device]: customValue };
    }
    update({ ...style, units: nextUnits });
  }

  function setEdges(group: EdgeGroup, edge: keyof PageStyleEdges, raw: string) {
    const value = boundedNumber(raw, group === "margin" ? -500 : 0, group === "borderRadius" ? 300 : 500);
    const values = { ...(edgeSource(group) ?? {}) };
    const nextEdges = { ...(values[device] ?? {}) };
    const nextValue = value === undefined ? undefined : value;
    if (linkedEdges[group]) {
      for (const edgeName of edgeNames.map((item) => item.key)) {
        if (nextValue === undefined) delete nextEdges[edgeName];
        else nextEdges[edgeName] = nextValue;
      }
    } else if (nextValue === undefined) delete nextEdges[edge];
    else nextEdges[edge] = nextValue;
    if (Object.keys(nextEdges).length > 0) values[device] = nextEdges;
    else delete values[device];
    const nextValues = Object.keys(values).length > 0 ? values : undefined;
    if (group === "margin") update({ ...style, margin: nextValues });
    else if (group === "padding") update({ ...style, padding: nextValues });
    else update({ ...style, border: { ...style.border, radius: nextValues } });
  }

  function toggleEdges(group: EdgeGroup) {
    const linked = !linkedEdges[group];
    setLinkedEdges((current) => ({ ...current, [group]: linked }));
    if (!linked) return;
    const values = { ...(edgeSource(group) ?? {}) };
    const current = values[device] ?? values.desktop ?? {};
    const seed = current.top ?? current.right ?? current.bottom ?? current.left ?? 0;
    values[device] = { top: seed, right: seed, bottom: seed, left: seed };
    const nextValues = Object.keys(values).length > 0 ? values : undefined;
    if (group === "margin") update({ ...style, margin: nextValues });
    else if (group === "padding") update({ ...style, padding: nextValues });
    else update({ ...style, border: { ...style.border, radius: nextValues } });
  }

  function setResponsiveNumber(key: "width" | "maxWidth" | "height" | "opacity", raw: string, min: number, max: number) {
    const value = boundedNumber(raw, min, max);
    const values = { ...((style[key] as PageStyleNumber | undefined) ?? {}) };
    if (value === undefined) delete values[device];
    else values[device] = value;
    update({ ...style, [key]: Object.keys(values).length > 0 ? values : undefined });
  }

  function setMotion(key: keyof PageBlockMotion, value: string) {
    const nextValue = key === "duration" || key === "delay" ? boundedNumber(value, 0, 10_000) : value === "" ? undefined : value;
    const nextMotion = { ...style.motion, [key]: nextValue };
    update({ ...style, motion: nextMotion });
  }

  function setTransformValues(patch: Partial<PageBlockTransformValues>) {
    const nextTransform = { ...style.transform, [transformMode]: { ...transform, ...patch } };
    update({ ...style, transform: nextTransform });
  }

  function setTransformNumber(key: TransformNumberKey, raw: string, min: number, max: number) {
    const value = boundedNumber(raw, min, max);
    const values = { ...((transform[key] as PageStyleNumber | undefined) ?? {}) };
    if (value === undefined) delete values[device];
    else values[device] = value;
    setTransformValues({ [key]: Object.keys(values).length > 0 ? values : undefined });
  }

  function transformValue(key: TransformNumberKey): string {
    return numberText((transform[key] as PageStyleNumber | undefined)?.[device] ?? (transform[key] as PageStyleNumber | undefined)?.desktop);
  }

  const alignOptions = [
    { value: "start" as const, label: "Start", icon: <AlignStartHorizontal size={16} /> },
    { value: "center" as const, label: "Center", icon: <AlignCenterHorizontal size={16} /> },
    { value: "end" as const, label: "End", icon: <AlignEndHorizontal size={16} /> },
    { value: "stretch" as const, label: "Stretch", icon: <StretchHorizontal size={16} /> },
  ];
  const sizeOptions = [
    { value: "default" as const, label: "Default", icon: <Ban size={16} /> },
    { value: "grow" as const, label: "Grow", icon: <Maximize2 size={16} /> },
    { value: "shrink" as const, label: "Shrink", icon: <Minimize2 size={16} /> },
    { value: "full" as const, label: "Full width", icon: <ChevronsLeftRight size={16} /> },
  ];

  return <div className="page-builder-advanced-style-groups">
    <details className="page-style-group page-builder-advanced-layout" open>
      <summary>Layout</summary>
      <div className="page-builder-advanced-layout-body">
        <EdgeControl title="Margin" group="margin" device={device} linked={linkedEdges.margin} onToggleLink={() => toggleEdges("margin")} edgeValue={edgeValue} setEdges={setEdges} unit={edgeUnit("margin")} customUnit={edgeCustomUnit("margin")} onChangeUnit={(value, customValue) => setEdgeUnit("margin", value, customValue)} />
        <EdgeControl title="Padding" group="padding" device={device} linked={linkedEdges.padding} onToggleLink={() => toggleEdges("padding")} edgeValue={edgeValue} setEdges={setEdges} unit={edgeUnit("padding")} customUnit={edgeCustomUnit("padding")} onChangeUnit={(value, customValue) => setEdgeUnit("padding", value, customValue)} />
        <div className="page-style-advanced-row">
          <FieldHeading label="Width" unit="" />
          <select value={style.widthMode ?? "default"} onChange={(event) => update({ ...style, widthMode: event.target.value as PageBlockStyle["widthMode"] })}><option value="default">Default</option><option value="full">Full width</option><option value="inline">Inline / auto</option><option value="custom">Custom percentage</option></select>
        </div>
        {style.widthMode === "custom" ? <NumberField label="Width" value={numberText(style.width?.[device] ?? style.width?.desktop)} min={0} max={100} unit="%" onChange={(value) => setResponsiveNumber("width", value, 0, 100)} /> : null}
        <NumberField label="Max width" value={numberText(style.maxWidth?.[device] ?? style.maxWidth?.desktop)} min={0} max={100} unit="%" onChange={(value) => setResponsiveNumber("maxWidth", value, 0, 100)} />
        <NumberField label="Height" value={numberText(style.height?.[device] ?? style.height?.desktop)} min={0} max={3_000} unit="px" onChange={(value) => setResponsiveNumber("height", value, 0, 3_000)} />
        <NumberField label="Opacity" value={numberText(style.opacity?.[device] ?? style.opacity?.desktop)} min={0} max={1} step={0.05} unit="" onChange={(value) => setResponsiveNumber("opacity", value, 0, 1)} />
        <SegmentedControl label="Align self" value={style.alignSelf === "default" ? "start" : style.alignSelf ?? "start"} options={alignOptions} onChange={(value) => update({ ...style, alignSelf: value })} />
        <p className="page-style-advanced-help">This control will affect contained elements only.</p>
        <div className="page-style-advanced-row">
          <FieldHeading label="Order" unit="" />
          <div className="page-style-segmented-control" role="group" aria-label="Order">
            <button type="button" aria-label="Move order up" title={`Move order up (${style.order ?? 0})`} onClick={() => update({ ...style, order: (style.order ?? 0) - 1 })}><ArrowUp size={16} /></button>
            <button type="button" aria-label="Move order down" title={`Move order down (${style.order ?? 0})`} onClick={() => update({ ...style, order: (style.order ?? 0) + 1 })}><ArrowDown size={16} /></button>
            <button type="button" aria-label="Reset order" title="Reset order" onClick={() => update({ ...style, order: undefined })}><EllipsisVertical size={16} /></button>
          </div>
        </div>
        <p className="page-style-advanced-help">This control will affect contained elements only.</p>
        <SegmentedControl label="Size" value={style.size ?? "default"} options={sizeOptions} onChange={(value) => update({ ...style, size: value })} />
        <div className="page-style-advanced-divider" />
        <div className="page-style-advanced-row">
          <FieldHeading label="Position" unit="" />
          <select value={style.position ?? "default"} onChange={(event) => update({ ...style, position: event.target.value as PageBlockStyle["position"] })}><option value="default">Default</option><option value="relative">Relative</option><option value="absolute">Absolute</option><option value="fixed">Fixed</option></select>
        </div>
        <NumberField label="Z-Index" value={numberText(style.zIndex)} min={-1_000} max={10_000} unit="" onChange={(value) => update({ ...style, zIndex: boundedNumber(value, -1_000, 10_000) })} />
        {layoutFooter}
      </div>
    </details>

    <details className="page-style-group"><summary>Motion Effects</summary><div className="page-style-grid page-style-advanced-section-body"><label className="field"><span>Entrance animation</span><select value={style.motion?.entrance ?? "none"} onChange={(event) => setMotion("entrance", event.target.value)}><option value="none">None</option><option value="fade">Fade in</option><option value="slide-up">Slide up</option><option value="slide-down">Slide down</option><option value="slide-left">Slide left</option><option value="slide-right">Slide right</option><option value="zoom">Zoom in</option></select></label><NumberField label="Duration" value={numberText(style.motion?.duration)} min={0} max={10_000} unit="ms" onChange={(value) => setMotion("duration", value)} /><NumberField label="Delay" value={numberText(style.motion?.delay)} min={0} max={10_000} unit="ms" onChange={(value) => setMotion("delay", value)} /><label className="field"><span>Sticky</span><select value={style.motion?.sticky ?? "none"} onChange={(event) => setMotion("sticky", event.target.value)}><option value="none">None</option><option value="top">Top</option><option value="bottom">Bottom</option></select></label></div></details>

    <details className="page-style-group"><summary>Transform</summary><div className="page-style-advanced-section-body"><div className="page-style-toggle-tabs" role="tablist" aria-label="Transform state"><button type="button" className={transformMode === "normal" ? "is-active" : ""} role="tab" aria-selected={transformMode === "normal"} onClick={() => setTransformMode("normal")}>Normal</button><button type="button" className={transformMode === "hover" ? "is-active" : ""} role="tab" aria-selected={transformMode === "hover"} onClick={() => setTransformMode("hover")}>Hover</button></div>{[
      ["rotate", "Rotate", -360, 360, "deg"],
      ["offset", "Offset", -2_000, 2_000, "px"],
      ["scale", "Scale", 0, 4, ""],
      ["skew", "Skew", -180, 180, "deg"],
     ].map(([key, label, min, max, unit]) => <div className="page-style-transform-row" key={key}><div><span>{label}</span><button type="button" className={editingTransform === String(key) ? "is-active" : ""} aria-label={`Edit ${label}`} title={`Edit ${label}`} onClick={() => setEditingTransform(editingTransform === String(key) ? null : String(key))}><Pencil size={15} /></button></div>{editingTransform === String(key) ? <div className="page-style-grid">{key === "offset" ? <><NumberField label="X" value={transformValue("offsetX")} min={Number(min)} max={Number(max)} unit={String(unit)} onChange={(value) => setTransformNumber("offsetX", value, Number(min), Number(max))} /><NumberField label="Y" value={transformValue("offsetY")} min={Number(min)} max={Number(max)} unit={String(unit)} onChange={(value) => setTransformNumber("offsetY", value, Number(min), Number(max))} /></> : key === "skew" ? <><NumberField label="X" value={transformValue("skewX")} min={Number(min)} max={Number(max)} unit={String(unit)} onChange={(value) => setTransformNumber("skewX", value, Number(min), Number(max))} /><NumberField label="Y" value={transformValue("skewY")} min={Number(min)} max={Number(max)} unit={String(unit)} onChange={(value) => setTransformNumber("skewY", value, Number(min), Number(max))} /></> : <NumberField label={String(label)} value={transformValue(key as TransformNumberKey)} min={Number(min)} max={Number(max)} unit={String(unit)} onChange={(value) => setTransformNumber(key as TransformNumberKey, value, Number(min), Number(max))} />}</div> : null}</div>)}<div className="page-style-transform-row"><div><span>Flip Horizontal</span><button type="button" className={transform.flipHorizontal ? "is-active" : ""} aria-pressed={transform.flipHorizontal ?? false} onClick={() => setTransformValues({ flipHorizontal: !transform.flipHorizontal })}>↔</button></div></div><div className="page-style-transform-row"><div><span>Flip Vertical</span><button type="button" className={transform.flipVertical ? "is-active" : ""} aria-pressed={transform.flipVertical ?? false} onClick={() => setTransformValues({ flipVertical: !transform.flipVertical })}>↕</button></div></div></div></details>

    <details className="page-style-group"><summary>Background</summary><div className="page-style-advanced-section-body"><div className="page-style-toggle-tabs" role="tablist" aria-label="Background state"><button type="button" className="is-active" role="tab" aria-selected="true">Normal</button><button type="button" role="tab" aria-selected="false">Hover</button></div><FieldHeading label="Background type" unit=""><div className="page-style-icon-button-group"><button type="button" className={style.background?.mode === "classic" ? "is-active" : ""} aria-label="Classic background" title="Classic background" onClick={() => update({ ...style, background: { ...style.background, mode: "classic" } })}><Paintbrush size={15} /></button><button type="button" className={style.background?.mode === "gradient" ? "is-active" : ""} aria-label="Gradient background" title="Gradient background" onClick={() => update({ ...style, background: { ...style.background, mode: "gradient" } })}><span className="page-style-gradient-icon" aria-hidden="true" /></button></div></FieldHeading>{style.background?.mode === "classic" ? <div className="page-style-grid"><label className="page-style-color"><span>Color</span><input type="color" value={style.background.color ?? "#ffffff"} onChange={(event) => update({ ...style, background: { ...style.background, color: event.target.value } })} /></label><label className="field"><span>Image URL</span><input type="url" value={style.background.image ?? ""} onChange={(event) => update({ ...style, background: { ...style.background, image: event.target.value } })} /></label></div> : null}{style.background?.mode === "gradient" ? <div className="page-style-grid"><label className="page-style-color"><span>Start color</span><input type="color" value={style.background.gradientStart ?? "#183b36"} onChange={(event) => update({ ...style, background: { ...style.background, gradientStart: event.target.value } })} /></label><label className="page-style-color"><span>End color</span><input type="color" value={style.background.gradientEnd ?? "#d8f1ea"} onChange={(event) => update({ ...style, background: { ...style.background, gradientEnd: event.target.value } })} /></label></div> : null}</div></details>

    <details className="page-style-group"><summary>Border</summary><div className="page-style-advanced-section-body"><div className="page-style-toggle-tabs" role="tablist" aria-label="Border state"><button type="button" className="is-active" role="tab" aria-selected="true">Normal</button><button type="button" role="tab" aria-selected="false">Hover</button></div><label className="field"><span>Border type</span><select value={style.border?.type ?? "default"} onChange={(event) => update({ ...style, border: { ...style.border, type: event.target.value as NonNullable<PageBlockStyle["border"]>["type"] } })}><option value="default">Default</option><option value="none">None</option><option value="solid">Solid</option><option value="double">Double</option><option value="dotted">Dotted</option><option value="dashed">Dashed</option><option value="groove">Groove</option></select></label><EdgeControl title="Border radius" group="borderRadius" device={device} linked={linkedEdges.borderRadius} onToggleLink={() => toggleEdges("borderRadius")} edgeValue={edgeValue} setEdges={setEdges} unit={edgeUnit("borderRadius")} customUnit={edgeCustomUnit("borderRadius")} onChangeUnit={(value, customValue) => setEdgeUnit("borderRadius", value, customValue)} /><div className="page-style-transform-row"><div><span>Box Shadow</span><button type="button" aria-label="Edit box shadow" title="Edit box shadow"><Pencil size={15} /></button></div></div></div></details>

    <details className="page-style-group"><summary>Mask</summary><div className="page-style-advanced-section-body"><div className="page-style-visibility-row"><span>Mask</span><button type="button" className={`page-style-switch ${style.mask?.enabled ? "is-active" : ""}`} aria-pressed={style.mask?.enabled ?? false} onClick={() => update({ ...style, mask: { ...style.mask, enabled: !style.mask?.enabled } })}><span>{style.mask?.enabled ? "On" : "Off"}</span></button></div>{style.mask?.enabled ? <label className="field"><span>Shape</span><select value={style.mask.shape ?? "circle"} onChange={(event) => update({ ...style, mask: { ...style.mask, shape: event.target.value as NonNullable<PageBlockStyle["mask"]>["shape"] } })}><option value="circle">Circle</option><option value="oval">Oval</option><option value="pill">Pill horizontal</option><option value="pill-vertical">Pill vertical</option><option value="triangle">Triangle</option><option value="diamond">Diamond</option><option value="hexagon">Hexagon</option><option value="blob">Blob</option><option value="custom">Custom image or SVG</option></select></label> : null}</div></details>

    <details className="page-style-group"><summary>Responsive</summary><div className="page-style-advanced-section-body"><p className="page-style-advanced-help">Responsive visibility takes effect only on preview mode or the live page, not while editing.</p>{responsiveDevices.map(([deviceKey, label]) => { const hidden = hiddenDevices.has(deviceKey); return <div className="page-style-visibility-row" key={deviceKey}><span>Hide On {label}</span><button type="button" className={`page-style-switch ${hidden ? "is-active" : ""}`} aria-pressed={hidden} onClick={() => onToggleResponsive(deviceKey, !hidden)}><span>{hidden ? "Hide" : "Show"}</span></button></div>; })}</div></details>
  </div>;
}
