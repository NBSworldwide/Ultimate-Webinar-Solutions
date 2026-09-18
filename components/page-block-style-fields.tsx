"use client";

import { useState } from "react";
import { PAGE_STYLE_DEVICES } from "@/lib/page-styles";
import { MediaPicker } from "@/components/media-picker";
import type {
  PageBlock,
  PageBlockStyle,
  PageStyleBorderType,
  PageStyleAspectRatio,
  PageStyleBox,
  PageStyleDevice,
  PageStyleEdges,
  PageStyleNumber,
} from "@/lib/types";

type EdgeName = keyof PageStyleEdges;
type EdgeGroup = "margin" | "padding" | "borderWidth" | "borderRadius";

const edgeNames: Array<{ key: EdgeName; label: string }> = [
  { key: "top", label: "Top" },
  { key: "right", label: "Right" },
  { key: "bottom", label: "Bottom" },
  { key: "left", label: "Left" },
];

function numberText(value: number | undefined): string {
  return value === undefined ? "" : String(value);
}

function colorText(value: string | undefined, fallback: string): string {
  return value && /^#[0-9a-f]{3,8}$/i.test(value) ? value : fallback;
}

function NumberControl({ id, label, value, onChange, min, max, step = 1, unit = "px" }: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}) {
  return <label className="page-style-number">
    <span>{label}</span>
    <span className="page-style-number-input">
      <input id={id} type="number" value={value} min={min} max={max} step={step} onChange={(event) => onChange(event.target.value)} />
      <small>{unit}</small>
    </span>
  </label>;
}

function EdgeControls({ title, group, device, linked, onToggleLink, edgeValue, setEdges }: {
  title: string;
  group: EdgeGroup;
  device: PageStyleDevice;
  linked: boolean;
  onToggleLink: () => void;
  edgeValue: (group: EdgeGroup, edge: EdgeName) => string;
  setEdges: (group: EdgeGroup, edge: EdgeName, value: string) => void;
}) {
  return <div className="page-style-edges">
    <div className="page-style-subheading"><strong>{title}</strong><span>{device === "desktop" ? "Desktop values" : "Device override"}<button type="button" className={`page-style-link-toggle ${linked ? "is-active" : ""}`} aria-pressed={linked} aria-label={`${linked ? "Unlink" : "Link"} ${title.toLowerCase()} values`} title={`${linked ? "Unlink" : "Link"} values`} onClick={onToggleLink}>⛓</button></span></div>
    <div className="page-style-edge-grid">
      {edgeNames.map(({ key, label }) => <NumberControl
        key={key}
        id={`page-style-${group}-${device}-${key}`}
        label={label}
        value={edgeValue(group, key)}
        min={group === "margin" ? -500 : 0}
        max={group === "borderWidth" ? 40 : group === "borderRadius" ? 300 : 500}
        onChange={(value) => setEdges(group, key, value)}
      />)}
    </div>
  </div>;
}

export function PageBlockStyleFields({ block, onChange }: {
  block: PageBlock;
  onChange: (style: PageBlockStyle | undefined) => void;
}) {
  const [device, setDevice] = useState<PageStyleDevice>("desktop");
  const style = block.style ?? {};
  const baseId = `page-style-${block.id}`;
  const [linkedEdges, setLinkedEdges] = useState<Record<EdgeGroup, boolean>>({ margin: false, padding: false, borderWidth: false, borderRadius: false });

  function update(next: PageBlockStyle) {
    onChange(next);
  }

  function setResponsiveNumber(key: "width" | "maxWidth" | "height" | "opacity", raw: string) {
    const value = raw === "" ? undefined : Number(raw);
    const values = { ...((style[key] as PageStyleNumber | undefined) ?? {}) };
    if (value === undefined || !Number.isFinite(value)) delete values[device];
    else values[device] = value;
    update({ ...style, [key]: Object.keys(values).length > 0 ? values : undefined });
  }

  function setEdges(group: EdgeGroup, edge: EdgeName, raw: string) {
    const value = raw === "" ? undefined : Number(raw);
    const key = group === "margin" ? "margin" : group === "padding" ? "padding" : "border";
    const property = group === "borderWidth" ? "width" : "radius";
    const current = key === "border" ? style.border?.[property] : style[key];
    const values = { ...((current as PageStyleBox | undefined) ?? {}) };
    const nextEdges = { ...(values[device] ?? {}) };
    if (linkedEdges[group]) {
      for (const edgeName of edgeNames.map((item) => item.key)) {
        if (value === undefined || !Number.isFinite(value)) delete nextEdges[edgeName];
        else nextEdges[edgeName] = value;
      }
    } else if (value === undefined || !Number.isFinite(value)) delete nextEdges[edge];
    else nextEdges[edge] = value;
    if (Object.keys(nextEdges).length > 0) values[device] = nextEdges;
    else delete values[device];
    if (key === "border") update({ ...style, border: { ...style.border, [property]: Object.keys(values).length > 0 ? values : undefined } });
    else update({ ...style, [key]: Object.keys(values).length > 0 ? values : undefined });
  }

  function toggleEdges(group: EdgeGroup) {
    const nextLinked = !linkedEdges[group];
    setLinkedEdges((current) => ({ ...current, [group]: nextLinked }));
    if (!nextLinked) return;
    const key = group === "margin" ? "margin" : group === "padding" ? "padding" : "border";
    const property = group === "borderWidth" ? "width" : "radius";
    const current = key === "border" ? style.border?.[property] : style[key];
    const values = { ...((current as PageStyleBox | undefined) ?? {}) };
    values[device] = { top: 0, right: 0, bottom: 0, left: 0 };
    if (key === "border") update({ ...style, border: { ...style.border, [property]: values } });
    else update({ ...style, [key]: values });
  }

  function edgeValue(group: EdgeGroup, edge: EdgeName): string {
    const key = group === "margin" ? "margin" : group === "padding" ? "padding" : "border";
    const property = group === "borderWidth" ? "width" : "radius";
    const current = key === "border" ? style.border?.[property] : style[key];
    const values = current as PageStyleBox | undefined;
    return numberText(values?.[device]?.[edge] ?? values?.desktop?.[edge]);
  }

  function setTypography(key: string, value: unknown) {
    update({ ...style, typography: { ...style.typography, [key]: value === "" ? undefined : value } });
  }

  function setTypographyNumber(key: "fontSize" | "lineHeight" | "letterSpacing" | "wordSpacing", raw: string) {
    const value = raw === "" ? undefined : Number(raw);
    const values = { ...((style.typography?.[key] as PageStyleNumber | undefined) ?? {}) };
    if (value === undefined || !Number.isFinite(value)) delete values[device];
    else values[device] = value;
    setTypography(key, Object.keys(values).length > 0 ? values : undefined);
  }

  function setTypographyNested(group: "textStroke" | "textShadow", key: string, value: unknown) {
    setTypography(group, { ...(style.typography?.[group] ?? {}), [key]: value === "" ? undefined : value });
  }

  function setTypographyNestedNumber(group: "textStroke" | "textShadow", key: "width" | "horizontal" | "vertical" | "blur", raw: string, min: number, max: number) {
    const value = raw === "" ? undefined : Number(raw);
    const typographyGroup = style.typography?.[group] as Record<string, unknown> | undefined;
    const current = typographyGroup?.[key] as PageStyleNumber | undefined;
    const values = { ...(current ?? {}) };
    if (value === undefined || !Number.isFinite(value)) delete values[device];
    else values[device] = Math.min(max, Math.max(min, value));
    setTypographyNested(group, key, Object.keys(values).length > 0 ? values : undefined);
  }

  function setBackground(key: string, value: unknown) {
    update({ ...style, background: { ...style.background, [key]: value === "" ? undefined : value } });
  }

  function setHover(key: string, value: string | number | undefined) {
    update({ ...style, hover: { ...style.hover, [key]: value === "" ? undefined : value } });
  }

  function setShadow(key: string, value: string | number | undefined) {
    update({ ...style, border: { ...style.border, shadow: { ...style.border?.shadow, [key]: value === "" ? undefined : value } } });
  }

  function setMask(key: string, value: boolean | string | undefined) {
    update({ ...style, mask: { ...style.mask, [key]: value === "" ? undefined : value } });
  }

  function setWidget(key: string, value: unknown) {
    update({ ...style, widget: { ...style.widget, [key]: value === "" ? undefined : value } });
  }

  function setWidgetNumber(key: "imageWidth" | "imageHeight" | "imageOpacity" | "iconSize" | "iconRotate", raw: string, min: number, max: number) {
    const value = raw === "" ? undefined : Number(raw);
    const values = { ...((style.widget?.[key] as PageStyleNumber | undefined) ?? {}) };
    if (value === undefined || !Number.isFinite(value)) delete values[device];
    else values[device] = Math.min(max, Math.max(min, value));
    setWidget(key, Object.keys(values).length > 0 ? values : undefined);
  }

  function setWidgetFilter(key: "blur" | "brightness" | "contrast" | "saturation" | "hue", raw: string) {
    const value = raw === "" ? undefined : Number(raw);
    const current = style.widget?.filter?.[key] as PageStyleNumber | undefined;
    const values = { ...(current ?? {}) };
    if (value === undefined || !Number.isFinite(value)) delete values[device];
    else values[device] = value;
    setWidget("filter", { ...style.widget?.filter, [key]: Object.keys(values).length > 0 ? values : undefined });
  }

  return <details className="page-block-style-panel" open>
    <summary>Style and responsive controls</summary>
    <div className="page-style-panel-body">
      <p className="page-style-help">Shared controls apply to this block in the live preview and on the published page. Values can be tailored per device.</p>
      <div className="page-style-device-tabs" role="tablist" aria-label="Responsive style device">
        <span>Device</span>
        {PAGE_STYLE_DEVICES.map(({ key, label }) => <button type="button" key={key} className={device === key ? "is-active" : ""} onClick={() => setDevice(key)} role="tab" aria-selected={device === key}>{label}</button>)}
      </div>

      <details className="page-style-group" open>
        <summary>Layout</summary>
        <div className="page-style-grid">
          <label className="field"><span>Width behavior</span><select value={style.widthMode ?? "default"} onChange={(event) => update({ ...style, widthMode: event.target.value as PageBlockStyle["widthMode"] })}><option value="default">Default</option><option value="full">Full width</option><option value="inline">Inline / auto</option><option value="custom">Custom percentage</option></select></label>
          {style.widthMode === "custom" ? <NumberControl id={`${baseId}-width`} label="Width" value={numberText(style.width?.[device] ?? style.width?.desktop)} min={0} max={100} onChange={(value) => setResponsiveNumber("width", value)} unit="%" /> : null}
          <NumberControl id={`${baseId}-max-width`} label="Max width" value={numberText(style.maxWidth?.[device] ?? style.maxWidth?.desktop)} min={0} max={100} onChange={(value) => setResponsiveNumber("maxWidth", value)} unit="%" />
          <NumberControl id={`${baseId}-height`} label="Height" value={numberText(style.height?.[device] ?? style.height?.desktop)} min={0} max={3_000} onChange={(value) => setResponsiveNumber("height", value)} />
          <NumberControl id={`${baseId}-opacity`} label="Opacity" value={numberText(style.opacity?.[device] ?? style.opacity?.desktop)} min={0} max={1} step={0.05} onChange={(value) => setResponsiveNumber("opacity", value)} unit="" />
          <label className="field"><span>Align self</span><select value={style.alignSelf ?? "default"} onChange={(event) => update({ ...style, alignSelf: event.target.value as PageBlockStyle["alignSelf"] })}><option value="default">Default</option><option value="start">Start</option><option value="center">Center</option><option value="end">End</option><option value="stretch">Stretch</option></select></label>
          <label className="field"><span>Position</span><select value={style.position ?? "default"} onChange={(event) => update({ ...style, position: event.target.value as PageBlockStyle["position"] })}><option value="default">Default</option><option value="relative">Relative</option><option value="absolute">Absolute</option><option value="fixed">Fixed</option></select></label>
          <NumberControl id={`${baseId}-z-index`} label="Z-index" value={numberText(style.zIndex)} min={-1_000} max={10_000} onChange={(value) => update({ ...style, zIndex: value === "" ? undefined : Number(value) })} unit="" />
        </div>
      </details>

      {(["image", "image_box", "video", "map", "icon", "icon_box"] as string[]).includes(block.type) ? <details className="page-style-group">
        <summary>Widget-specific controls</summary>
        {(["image", "image_box"].includes(block.type)) ? <>
          {block.type === "image_box" ? <div className="page-style-grid"><label className="field"><span>Image position</span><select value={style.widget?.imagePosition ?? "top"} onChange={(event) => setWidget("imagePosition", event.target.value)}><option value="left">Left</option><option value="top">Above</option><option value="right">Right</option><option value="bottom">Below</option></select></label><label className="field"><span>Image alignment</span><select value={style.widget?.imageAlign ?? "left"} onChange={(event) => setWidget("imageAlign", event.target.value)}><option value="left">Start</option><option value="center">Center</option><option value="right">End</option></select></label><NumberControl id={`${baseId}-image-spacing`} label="Image spacing" value={numberText(style.widget?.imageSpacing)} min={0} max={300} onChange={(value) => setWidget("imageSpacing", value === "" ? undefined : Number(value))} /><NumberControl id={`${baseId}-content-spacing`} label="Content spacing" value={numberText(style.widget?.contentSpacing)} min={0} max={300} onChange={(value) => setWidget("contentSpacing", value === "" ? undefined : Number(value))} /></div> : null}
          <div className="page-style-subgroup"><div className="page-style-grid"><NumberControl id={`${baseId}-image-width`} label="Image width" value={numberText(style.widget?.imageWidth?.[device] ?? style.widget?.imageWidth?.desktop)} min={0} max={100} onChange={(value) => setWidgetNumber("imageWidth", value, 0, 100)} unit="%" /><NumberControl id={`${baseId}-image-height`} label="Image height" value={numberText(style.widget?.imageHeight?.[device] ?? style.widget?.imageHeight?.desktop)} min={0} max={3000} onChange={(value) => setWidgetNumber("imageHeight", value, 0, 3000)} /><NumberControl id={`${baseId}-image-opacity`} label="Image opacity" value={numberText(style.widget?.imageOpacity?.[device] ?? style.widget?.imageOpacity?.desktop)} min={0} max={1} step={0.05} onChange={(value) => setWidgetNumber("imageOpacity", value, 0, 1)} unit="" /></div><div className="page-style-grid"><NumberControl id={`${baseId}-filter-blur`} label="Blur" value={numberText(style.widget?.filter?.blur?.[device] ?? style.widget?.filter?.blur?.desktop)} min={0} max={40} onChange={(value) => setWidgetFilter("blur", value)} /><NumberControl id={`${baseId}-filter-brightness`} label="Brightness" value={numberText(style.widget?.filter?.brightness?.[device] ?? style.widget?.filter?.brightness?.desktop)} min={0} max={3} step={0.05} onChange={(value) => setWidgetFilter("brightness", value)} unit="" /><NumberControl id={`${baseId}-filter-contrast`} label="Contrast" value={numberText(style.widget?.filter?.contrast?.[device] ?? style.widget?.filter?.contrast?.desktop)} min={0} max={3} step={0.05} onChange={(value) => setWidgetFilter("contrast", value)} unit="" /><NumberControl id={`${baseId}-filter-saturation`} label="Saturation" value={numberText(style.widget?.filter?.saturation?.[device] ?? style.widget?.filter?.saturation?.desktop)} min={0} max={3} step={0.05} onChange={(value) => setWidgetFilter("saturation", value)} unit="" /><NumberControl id={`${baseId}-filter-hue`} label="Hue" value={numberText(style.widget?.filter?.hue?.[device] ?? style.widget?.filter?.hue?.desktop)} min={-180} max={180} onChange={(value) => setWidgetFilter("hue", value)} unit="deg" /></div></div>
        </> : null}
        {block.type === "video" || block.type === "map" ? <div className="page-style-grid"><label className="field"><span>Aspect ratio</span><select value={style.widget?.aspectRatio ?? "16/9"} onChange={(event) => setWidget("aspectRatio", event.target.value as PageStyleAspectRatio)}><option value="1/1">1:1</option><option value="3/2">3:2</option><option value="4/3">4:3</option><option value="16/9">16:9</option><option value="21/9">21:9</option><option value="9/16">9:16</option></select></label><div className="page-style-subgroup"><div className="page-style-grid"><NumberControl id={`${baseId}-media-filter-blur`} label="Blur" value={numberText(style.widget?.filter?.blur?.[device] ?? style.widget?.filter?.blur?.desktop)} min={0} max={40} onChange={(value) => setWidgetFilter("blur", value)} /><NumberControl id={`${baseId}-media-filter-brightness`} label="Brightness" value={numberText(style.widget?.filter?.brightness?.[device] ?? style.widget?.filter?.brightness?.desktop)} min={0} max={3} step={0.05} onChange={(value) => setWidgetFilter("brightness", value)} unit="" /><NumberControl id={`${baseId}-media-filter-contrast`} label="Contrast" value={numberText(style.widget?.filter?.contrast?.[device] ?? style.widget?.filter?.contrast?.desktop)} min={0} max={3} step={0.05} onChange={(value) => setWidgetFilter("contrast", value)} unit="" /><NumberControl id={`${baseId}-media-filter-saturation`} label="Saturation" value={numberText(style.widget?.filter?.saturation?.[device] ?? style.widget?.filter?.saturation?.desktop)} min={0} max={3} step={0.05} onChange={(value) => setWidgetFilter("saturation", value)} unit="" /><NumberControl id={`${baseId}-media-filter-hue`} label="Hue" value={numberText(style.widget?.filter?.hue?.[device] ?? style.widget?.filter?.hue?.desktop)} min={-180} max={180} onChange={(value) => setWidgetFilter("hue", value)} unit="deg" /></div></div></div> : null}
        {block.type === "icon" || block.type === "icon_box" ? <div className="page-style-grid"><label className="field"><span>Icon alignment</span><select value={style.widget?.iconAlign ?? "center"} onChange={(event) => setWidget("iconAlign", event.target.value)}><option value="left">Start</option><option value="center">Center</option><option value="right">End</option></select></label><label className="page-style-color"><span>Icon color</span><input type="color" value={colorText(style.widget?.iconColor, "#0f776e")} onChange={(event) => setWidget("iconColor", event.target.value)} /></label><NumberControl id={`${baseId}-icon-size`} label="Icon size" value={numberText(style.widget?.iconSize?.[device] ?? style.widget?.iconSize?.desktop)} min={8} max={240} onChange={(value) => setWidgetNumber("iconSize", value, 8, 240)} /><NumberControl id={`${baseId}-icon-rotate`} label="Icon rotation" value={numberText(style.widget?.iconRotate?.[device] ?? style.widget?.iconRotate?.desktop)} min={-360} max={360} onChange={(value) => setWidgetNumber("iconRotate", value, -360, 360)} unit="deg" /></div> : null}
      </details> : null}

      <details className="page-style-group">
        <summary>Typography</summary>
        <div className="page-style-grid">
          <label className="field"><span>Font family</span><select value={style.typography?.fontFamily ?? "default"} onChange={(event) => setTypography("fontFamily", event.target.value)}><option value="default">Global default</option><option value="Manrope">Manrope</option><option value="DM Mono">DM Mono</option><option value="Inter">Inter</option><option value="Arial">Arial</option><option value="Georgia">Georgia</option><option value="Verdana">Verdana</option></select></label>
          <NumberControl id={`${baseId}-font-size`} label="Font size" value={numberText(style.typography?.fontSize?.[device] ?? style.typography?.fontSize?.desktop)} min={8} max={160} onChange={(value) => setTypographyNumber("fontSize", value)} />
          <label className="field"><span>Weight</span><select value={style.typography?.fontWeight ? String(style.typography.fontWeight) : ""} onChange={(event) => setTypography("fontWeight", event.target.value === "" ? undefined : Number(event.target.value))}><option value="">Global default</option>{[100, 200, 300, 400, 500, 600, 700, 800, 900].map((weight) => <option key={weight} value={weight}>{weight}</option>)}</select></label>
          <label className="field"><span>Transform</span><select value={style.typography?.textTransform ?? "none"} onChange={(event) => setTypography("textTransform", event.target.value)}><option value="none">None</option><option value="uppercase">Uppercase</option><option value="lowercase">Lowercase</option><option value="capitalize">Capitalize</option></select></label>
          <label className="field"><span>Style</span><select value={style.typography?.fontStyle ?? "normal"} onChange={(event) => setTypography("fontStyle", event.target.value)}><option value="normal">Normal</option><option value="italic">Italic</option><option value="oblique">Oblique</option></select></label>
          <label className="field"><span>Decoration</span><select value={style.typography?.textDecoration ?? "none"} onChange={(event) => setTypography("textDecoration", event.target.value)}><option value="none">None</option><option value="underline">Underline</option><option value="overline">Overline</option><option value="line-through">Line through</option></select></label>
          <NumberControl id={`${baseId}-line-height`} label="Line height" value={numberText(style.typography?.lineHeight?.[device] ?? style.typography?.lineHeight?.desktop)} min={0.5} max={4} step={0.05} onChange={(value) => setTypographyNumber("lineHeight", value)} unit="" />
          <NumberControl id={`${baseId}-letter-spacing`} label="Letter spacing" value={numberText(style.typography?.letterSpacing?.[device] ?? style.typography?.letterSpacing?.desktop)} min={-20} max={40} onChange={(value) => setTypographyNumber("letterSpacing", value)} />
          <NumberControl id={`${baseId}-word-spacing`} label="Word spacing" value={numberText(style.typography?.wordSpacing?.[device] ?? style.typography?.wordSpacing?.desktop)} min={-20} max={80} onChange={(value) => setTypographyNumber("wordSpacing", value)} />
          <label className="field"><span>Text alignment</span><select value={style.typography?.textAlign ?? "left"} onChange={(event) => setTypography("textAlign", event.target.value)}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option><option value="justify">Justified</option></select></label>
        </div>
        <details className="page-style-subgroup"><summary>Text Stroke</summary><div className="page-style-grid"><NumberControl id={`${baseId}-text-stroke-width`} label="Stroke width" value={numberText(style.typography?.textStroke?.width?.[device] ?? style.typography?.textStroke?.width?.desktop)} min={0} max={20} step={0.5} onChange={(value) => setTypographyNestedNumber("textStroke", "width", value, 0, 20)} unit="px" /><label className="page-style-color"><span>Stroke color</span><input type="color" value={colorText(style.typography?.textStroke?.color, "#183b36")} onChange={(event) => setTypographyNested("textStroke", "color", event.target.value)} /></label></div></details>
        <details className="page-style-subgroup"><summary>Text Shadow</summary><div className="page-style-grid"><label className="page-style-color"><span>Shadow color</span><input type="color" value={colorText(style.typography?.textShadow?.color, "#183b36")} onChange={(event) => setTypographyNested("textShadow", "color", event.target.value)} /></label><NumberControl id={`${baseId}-text-shadow-horizontal`} label="Horizontal" value={numberText(style.typography?.textShadow?.horizontal?.[device] ?? style.typography?.textShadow?.horizontal?.desktop)} min={-200} max={200} onChange={(value) => setTypographyNestedNumber("textShadow", "horizontal", value, -200, 200)} unit="px" /><NumberControl id={`${baseId}-text-shadow-vertical`} label="Vertical" value={numberText(style.typography?.textShadow?.vertical?.[device] ?? style.typography?.textShadow?.vertical?.desktop)} min={-200} max={200} onChange={(value) => setTypographyNestedNumber("textShadow", "vertical", value, -200, 200)} unit="px" /><NumberControl id={`${baseId}-text-shadow-blur`} label="Blur" value={numberText(style.typography?.textShadow?.blur?.[device] ?? style.typography?.textShadow?.blur?.desktop)} min={0} max={300} onChange={(value) => setTypographyNestedNumber("textShadow", "blur", value, 0, 300)} unit="px" /></div></details>
      </details>

      <details className="page-style-group">
        <summary>Background</summary>
        <div className="page-style-grid"><label className="field"><span>Background type</span><select value={style.background?.mode ?? "none"} onChange={(event) => setBackground("mode", event.target.value)}><option value="none">None</option><option value="classic">Classic color or image</option><option value="gradient">Gradient</option><option value="video">Video</option><option value="slideshow">Slideshow</option></select></label></div>
        {style.background?.mode === "classic" ? <div className="page-style-subgroup">
          <div className="page-style-color-row"><label className="page-style-color"><span>Color</span><input type="color" value={colorText(style.background.color, "#ffffff")} onChange={(event) => setBackground("color", event.target.value)} /></label><button type="button" className="button button-secondary button-small" onClick={() => setBackground("color", undefined)}>Clear color</button></div>
          <label className="field"><span>Background image URL</span><input type="url" value={style.background.image ?? ""} onChange={(event) => setBackground("image", event.target.value)} placeholder="https://images.example.com/background.jpg" /></label>
          <div className="page-style-grid"><label className="field"><span>Image size</span><select value={style.background.imageSize ?? "cover"} onChange={(event) => setBackground("imageSize", event.target.value)}><option value="cover">Cover</option><option value="contain">Contain</option><option value="auto">Auto</option></select></label><label className="field"><span>Image position</span><select value={style.background.imagePosition ?? "center"} onChange={(event) => setBackground("imagePosition", event.target.value)}><option value="center">Center</option><option value="top">Top</option><option value="right">Right</option><option value="bottom">Bottom</option><option value="left">Left</option></select></label><label className="field"><span>Image repeat</span><select value={style.background.imageRepeat ?? "no-repeat"} onChange={(event) => setBackground("imageRepeat", event.target.value)}><option value="no-repeat">No repeat</option><option value="repeat">Repeat</option><option value="repeat-x">Repeat horizontally</option><option value="repeat-y">Repeat vertically</option></select></label></div>
        </div> : null}
        {style.background?.mode === "gradient" ? <div className="page-style-subgroup">
          <div className="page-style-color-grid"><label className="page-style-color"><span>Start color</span><input type="color" value={colorText(style.background.gradientStart, "#183b36")} onChange={(event) => setBackground("gradientStart", event.target.value)} /></label><label className="page-style-color"><span>End color</span><input type="color" value={colorText(style.background.gradientEnd, "#d8f1ea")} onChange={(event) => setBackground("gradientEnd", event.target.value)} /></label></div>
          <div className="page-style-grid"><NumberControl id={`${baseId}-gradient-start`} label="Start location" value={numberText(style.background.gradientStartLocation)} min={0} max={100} onChange={(value) => setBackground("gradientStartLocation", value === "" ? undefined : Number(value))} unit="%" /><NumberControl id={`${baseId}-gradient-end`} label="End location" value={numberText(style.background.gradientEndLocation)} min={0} max={100} onChange={(value) => setBackground("gradientEndLocation", value === "" ? undefined : Number(value))} unit="%" /><label className="field"><span>Gradient type</span><select value={style.background.gradientType ?? "linear"} onChange={(event) => setBackground("gradientType", event.target.value)}><option value="linear">Linear</option><option value="radial">Radial</option></select></label><NumberControl id={`${baseId}-gradient-angle`} label="Angle" value={numberText(style.background.angle?.[device] ?? style.background.angle?.desktop)} min={0} max={360} onChange={(value) => { const angle = value === "" ? undefined : Number(value); const values = { ...(style.background?.angle ?? {}) }; if (angle === undefined || !Number.isFinite(angle)) delete values[device]; else values[device] = angle; setBackground("angle", Object.keys(values).length > 0 ? values : undefined); }} unit="deg" /></div>
        </div> : null}
        {style.background?.mode === "video" ? <div className="page-style-subgroup"><div className="page-style-grid"><label className="field"><span>Video source</span><select value={style.background.videoSource ?? "file"} onChange={(event) => setBackground("videoSource", event.target.value)}><option value="file">Hosted video file</option><option value="youtube">YouTube</option><option value="vimeo">Vimeo</option></select></label><NumberControl id={`${baseId}-video-start`} label="Start time" value={numberText(style.background.videoStart)} min={0} max={86400} onChange={(value) => setBackground("videoStart", value === "" ? undefined : Number(value))} unit="sec" /><NumberControl id={`${baseId}-video-end`} label="End time" value={numberText(style.background.videoEnd)} min={0} max={86400} onChange={(value) => setBackground("videoEnd", value === "" ? undefined : Number(value))} unit="sec" /></div><label className="field"><span>Video URL</span><input type="url" value={style.background.videoUrl ?? ""} onChange={(event) => setBackground("videoUrl", event.target.value)} placeholder="https://cdn.example.com/background.mp4" /></label><label className="field"><span>Fallback image</span><input type="url" value={style.background.videoFallbackImage ?? ""} onChange={(event) => setBackground("videoFallbackImage", event.target.value)} placeholder="https://images.example.com/background.jpg" /></label><small>Hosted files render as a muted looping background. YouTube and Vimeo use privacy-safe autoplay embeds when the provider URL is valid.</small></div> : null}
        {style.background?.mode === "slideshow" ? <div className="page-style-subgroup"><label className="field"><span>Slide images</span><textarea value={(style.background.slideshowImages ?? []).join("\n")} onChange={(event) => setBackground("slideshowImages", event.target.value.split(/\r?\n/).map((value) => value.trim()).filter(Boolean))} rows={4} placeholder="One HTTPS image URL per line" /></label><div className="page-style-grid"><label className="field"><span>Transition</span><select value={style.background.slideshowTransition ?? "fade"} onChange={(event) => setBackground("slideshowTransition", event.target.value)}><option value="fade">Fade</option><option value="slide">Slide</option></select></label><NumberControl id={`${baseId}-slideshow-duration`} label="Duration" value={numberText(style.background.slideshowDuration)} min={1000} max={60000} onChange={(value) => setBackground("slideshowDuration", value === "" ? undefined : Number(value))} unit="ms" /><NumberControl id={`${baseId}-slideshow-transition-duration`} label="Transition speed" value={numberText(style.background.slideshowTransitionDuration)} min={100} max={10000} onChange={(value) => setBackground("slideshowTransitionDuration", value === "" ? undefined : Number(value))} unit="ms" /></div><div className="page-style-grid"><label className="form-choice"><input type="checkbox" checked={style.background.slideshowInfinite ?? true} onChange={(event) => setBackground("slideshowInfinite", event.target.checked)} /><span>Infinite loop</span></label><label className="form-choice"><input type="checkbox" checked={style.background.slideshowLazyLoad ?? true} onChange={(event) => setBackground("slideshowLazyLoad", event.target.checked)} /><span>Lazy load</span></label><label className="form-choice"><input type="checkbox" checked={style.background.slideshowKenBurns ?? false} onChange={(event) => setBackground("slideshowKenBurns", event.target.checked)} /><span>Ken Burns effect</span></label></div></div> : null}
      </details>

      <details className="page-style-group">
        <summary>Hover state</summary>
        <p className="page-style-help">Hover values apply when the visitor points to an interactive block or link.</p>
        <div className="page-style-color-grid"><div className="page-style-color-row"><label className="page-style-color"><span>Text color</span><input type="color" value={colorText(style.hover?.textColor, "#183b36")} onChange={(event) => setHover("textColor", event.target.value)} /></label><button type="button" className="button button-secondary button-small" onClick={() => setHover("textColor", undefined)}>Clear</button></div><div className="page-style-color-row"><label className="page-style-color"><span>Background color</span><input type="color" value={colorText(style.hover?.backgroundColor, "#d8f1ea")} onChange={(event) => setHover("backgroundColor", event.target.value)} /></label><button type="button" className="button button-secondary button-small" onClick={() => setHover("backgroundColor", undefined)}>Clear</button></div></div>
        <NumberControl id={`${baseId}-hover-opacity`} label="Hover opacity" value={numberText(style.hover?.opacity)} min={0} max={1} step={0.05} onChange={(value) => setHover("opacity", value === "" ? undefined : Number(value))} unit="" />
      </details>

      <details className="page-style-group">
        <summary>Border and shadow</summary>
        <div className="page-style-grid"><label className="field"><span>Border type</span><select value={style.border?.type ?? "default"} onChange={(event) => update({ ...style, border: { ...style.border, type: event.target.value as PageStyleBorderType } })}><option value="default">Default</option><option value="none">None</option><option value="solid">Solid</option><option value="double">Double</option><option value="dotted">Dotted</option><option value="dashed">Dashed</option><option value="groove">Groove</option></select></label><div className="page-style-color-row"><label className="page-style-color"><span>Border color</span><input type="color" value={colorText(style.border?.color, "#cbe5dd")} onChange={(event) => update({ ...style, border: { ...style.border, color: event.target.value } })} /></label><button type="button" className="button button-secondary button-small" onClick={() => update({ ...style, border: { ...style.border, color: undefined } })}>Clear</button></div></div>
        <EdgeControls title="Border width" group="borderWidth" device={device} linked={linkedEdges.borderWidth} onToggleLink={() => toggleEdges("borderWidth")} edgeValue={edgeValue} setEdges={setEdges} />
        <EdgeControls title="Border radius" group="borderRadius" device={device} linked={linkedEdges.borderRadius} onToggleLink={() => toggleEdges("borderRadius")} edgeValue={edgeValue} setEdges={setEdges} />
        <div className="page-style-subgroup"><div className="page-style-color-row"><label className="page-style-color"><span>Shadow color</span><input type="color" value={colorText(style.border?.shadow?.color, "#183b36")} onChange={(event) => setShadow("color", event.target.value)} /></label><button type="button" className="button button-secondary button-small" onClick={() => update({ ...style, border: { ...style.border, shadow: undefined } })}>Clear shadow</button></div><div className="page-style-grid"><NumberControl id={`${baseId}-shadow-horizontal`} label="Horizontal" value={numberText(style.border?.shadow?.horizontal)} min={-200} max={300} onChange={(value) => setShadow("horizontal", value === "" ? undefined : Number(value))} /><NumberControl id={`${baseId}-shadow-vertical`} label="Vertical" value={numberText(style.border?.shadow?.vertical)} min={-200} max={300} onChange={(value) => setShadow("vertical", value === "" ? undefined : Number(value))} /><NumberControl id={`${baseId}-shadow-blur`} label="Blur" value={numberText(style.border?.shadow?.blur)} min={0} max={300} onChange={(value) => setShadow("blur", value === "" ? undefined : Number(value))} /><NumberControl id={`${baseId}-shadow-spread`} label="Spread" value={numberText(style.border?.shadow?.spread)} min={-200} max={300} onChange={(value) => setShadow("spread", value === "" ? undefined : Number(value))} /><label className="field"><span>Shadow position</span><select value={style.border?.shadow?.position ?? "outline"} onChange={(event) => setShadow("position", event.target.value)}><option value="outline">Outline</option><option value="inset">Inset</option></select></label></div></div>
      </details>

      <details className="page-style-group">
        <summary>Mask</summary>
        <div className="page-style-grid"><label className="field"><span>Mask</span><select value={style.mask?.enabled ? "on" : "off"} onChange={(event) => setMask("enabled", event.target.value === "on")}><option value="off">Off</option><option value="on">On</option></select></label>{style.mask?.enabled ? <label className="field"><span>Shape</span><select value={style.mask.shape ?? "circle"} onChange={(event) => setMask("shape", event.target.value)}><option value="circle">Circle</option><option value="oval">Oval</option><option value="pill">Pill horizontal</option><option value="pill-vertical">Pill vertical</option><option value="triangle">Triangle</option><option value="diamond">Diamond</option><option value="hexagon">Hexagon</option><option value="blob">Blob</option><option value="custom">Custom image or SVG</option></select></label> : null}</div>
        {style.mask?.enabled && style.mask.shape === "custom" ? <label className="field"><span>Mask image or SVG URL</span><input type="url" value={style.mask.image ?? ""} onChange={(event) => setMask("image", event.target.value)} placeholder="https://images.example.com/mask.svg" /></label> : null}
        <p className="page-style-help">Masks are applied to the selected block without changing its layout box.</p>
      </details>

      <details className="page-style-group">
        <summary>Media Library shortcuts</summary>
        <p className="page-style-help">Choose reusable assets without leaving the Style panel. Direct URLs remain available in the controls above.</p>
        <div className="page-style-grid">
          <div className="field"><span>Background image</span><MediaPicker value={style.background?.image ?? ""} onChange={(value) => setBackground("image", value)} label="Choose background" /></div>
          <div className="field"><span>Video fallback image</span><MediaPicker value={style.background?.videoFallbackImage ?? ""} onChange={(value) => setBackground("videoFallbackImage", value)} label="Choose fallback" /></div>
          <div className="field"><span>Custom mask image or SVG</span><MediaPicker value={style.mask?.image ?? ""} onChange={(value) => setMask("image", value)} label="Choose mask" /></div>
          <div className="field"><span>Add slideshow image</span><MediaPicker value="" onChange={(value) => setBackground("slideshowImages", [...(style.background?.slideshowImages ?? []), value])} label="Add slide" /></div>
        </div>
      </details>
      <button type="button" className="button button-secondary button-small page-style-reset" onClick={() => onChange(undefined)}>Reset block styling</button>
    </div>
  </details>;
}
