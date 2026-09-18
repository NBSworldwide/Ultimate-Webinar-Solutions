import type { PageBlockLayout, PageBlockStyle, PageContainerAlign, PageContainerContentWidth, PageContainerDirection, PageContainerJustify, PageContainerMode, PageContainerSpacing, PageContainerWrap, PageStyleBox, PageStyleDevice, PageStyleEdges, PageStyleNumber } from "@/lib/types";

export const PAGE_STYLE_DEVICES: Array<{ key: PageStyleDevice; label: string }> = [
  { key: "widescreen", label: "Widescreen" },
  { key: "desktop", label: "Desktop" },
  { key: "laptop", label: "Laptop" },
  { key: "tabletLandscape", label: "Tablet landscape" },
  { key: "tabletPortrait", label: "Tablet portrait" },
  { key: "mobileLandscape", label: "Mobile landscape" },
  { key: "mobilePortrait", label: "Mobile portrait" },
];

const deviceKeys = new Set(PAGE_STYLE_DEVICES.map(({ key }) => key));
const hexColorPattern = /^#[0-9a-f]{3,8}$/i;
const safeImagePattern = /^(?:https:\/\/|\/)(?![\s"'<>`])/i;

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function numberValue(value: unknown, min: number, max: number): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return Math.min(max, Math.max(min, value));
}

function stringValue(value: unknown, max = 120): string | undefined {
  if (typeof value !== "string") return undefined;
  const result = value.trim().slice(0, max);
  return result || undefined;
}

function colorValue(value: unknown): string | undefined {
  const result = stringValue(value, 20);
  return result && (result === "transparent" || hexColorPattern.test(result)) ? result : undefined;
}

function imageValue(value: unknown): string | undefined {
  const result = stringValue(value, 2_000);
  return result && safeImagePattern.test(result) && !/[\\s"'<>`()]/.test(result) ? result : undefined;
}

function enumValue<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
  return typeof value === "string" && (allowed as readonly string[]).includes(value) ? value as T : undefined;
}

function responsiveNumbers(value: unknown, min: number, max: number): PageStyleNumber | undefined {
  const source = record(value);
  if (!source) return undefined;
  const result: PageStyleNumber = {};
  for (const key of deviceKeys) {
    const next = numberValue(source[key], min, max);
    if (next !== undefined) result[key] = next;
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

function edges(value: unknown, min: number, max: number): PageStyleEdges | undefined {
  const source = record(value);
  if (!source) return undefined;
  const result: PageStyleEdges = {};
  for (const key of ["top", "right", "bottom", "left"] as const) {
    const next = numberValue(source[key], min, max);
    if (next !== undefined) result[key] = next;
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

function responsiveEdges(value: unknown, min: number, max: number): PageStyleBox | undefined {
  const source = record(value);
  if (!source) return undefined;
  const result: PageStyleBox = {};
  for (const device of deviceKeys) {
    const next = edges(source[device], min, max);
    if (next) result[device] = next;
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

export function normalizePageBlockStyle(input: unknown): PageBlockStyle | undefined {
  const source = record(input);
  if (!source) return undefined;
  const result: PageBlockStyle = {};
  const widthMode = enumValue(source.widthMode, ["default", "full", "inline", "custom"] as const);
  if (widthMode) result.widthMode = widthMode;
  result.width = responsiveNumbers(source.width, 0, 100);
  result.maxWidth = responsiveNumbers(source.maxWidth, 0, 100);
  result.height = responsiveNumbers(source.height, 0, 3_000);
  result.opacity = responsiveNumbers(source.opacity, 0, 1);
  const alignSelf = enumValue(source.alignSelf, ["default", "start", "center", "end", "stretch"] as const);
  if (alignSelf) result.alignSelf = alignSelf;
  const position = enumValue(source.position, ["default", "relative", "absolute", "fixed"] as const);
  if (position) result.position = position;
  const zIndex = numberValue(source.zIndex, -1_000, 10_000);
  if (zIndex !== undefined) result.zIndex = Math.round(zIndex);
  result.margin = responsiveEdges(source.margin, -500, 500);
  result.padding = responsiveEdges(source.padding, 0, 500);

  const typography = record(source.typography);
  if (typography) {
    result.typography = {};
    const fontFamily = enumValue(typography.fontFamily, ["default", "Manrope", "DM Mono", "Inter", "Arial", "Georgia", "Verdana"] as const);
    if (fontFamily) result.typography.fontFamily = fontFamily;
    result.typography.fontSize = responsiveNumbers(typography.fontSize, 8, 160);
    const fontWeight = numberValue(typography.fontWeight, 100, 900);
    if (fontWeight !== undefined) result.typography.fontWeight = Math.round(fontWeight / 100) * 100;
    const textTransform = enumValue(typography.textTransform, ["none", "uppercase", "lowercase", "capitalize"] as const);
    if (textTransform) result.typography.textTransform = textTransform;
    const fontStyle = enumValue(typography.fontStyle, ["normal", "italic", "oblique"] as const);
    if (fontStyle) result.typography.fontStyle = fontStyle;
    const textDecoration = enumValue(typography.textDecoration, ["none", "underline", "overline", "line-through"] as const);
    if (textDecoration) result.typography.textDecoration = textDecoration;
    result.typography.lineHeight = responsiveNumbers(typography.lineHeight, 0.5, 4);
    result.typography.letterSpacing = responsiveNumbers(typography.letterSpacing, -20, 40);
    result.typography.wordSpacing = responsiveNumbers(typography.wordSpacing, -20, 80);
    const textAlign = enumValue(typography.textAlign, ["left", "center", "right", "justify"] as const);
    if (textAlign) result.typography.textAlign = textAlign;
    if (Object.keys(result.typography).length === 0) delete result.typography;
  }

  const background = record(source.background);
  if (background) {
    result.background = {};
    const mode = enumValue(background.mode, ["none", "classic", "gradient"] as const);
    if (mode) result.background.mode = mode;
    const color = colorValue(background.color);
    if (color) result.background.color = color;
    const image = imageValue(background.image);
    if (image) result.background.image = image;
    const imageSize = enumValue(background.imageSize, ["auto", "cover", "contain"] as const);
    if (imageSize) result.background.imageSize = imageSize;
    const imagePosition = enumValue(background.imagePosition, ["center", "top", "right", "bottom", "left"] as const);
    if (imagePosition) result.background.imagePosition = imagePosition;
    const imageRepeat = enumValue(background.imageRepeat, ["no-repeat", "repeat", "repeat-x", "repeat-y"] as const);
    if (imageRepeat) result.background.imageRepeat = imageRepeat;
    const gradientType = enumValue(background.gradientType, ["linear", "radial"] as const);
    if (gradientType) result.background.gradientType = gradientType;
    const gradientStart = colorValue(background.gradientStart);
    if (gradientStart) result.background.gradientStart = gradientStart;
    const gradientEnd = colorValue(background.gradientEnd);
    if (gradientEnd) result.background.gradientEnd = gradientEnd;
    const gradientStartLocation = numberValue(background.gradientStartLocation, 0, 100);
    if (gradientStartLocation !== undefined) result.background.gradientStartLocation = Math.round(gradientStartLocation);
    const gradientEndLocation = numberValue(background.gradientEndLocation, 0, 100);
    if (gradientEndLocation !== undefined) result.background.gradientEndLocation = Math.round(gradientEndLocation);
    result.background.angle = responsiveNumbers(background.angle, 0, 360);
    if (Object.keys(result.background).length === 0) delete result.background;
  }

  const hover = record(source.hover);
  if (hover) {
    result.hover = {};
    const textColor = colorValue(hover.textColor);
    if (textColor) result.hover.textColor = textColor;
    const backgroundColor = colorValue(hover.backgroundColor);
    if (backgroundColor) result.hover.backgroundColor = backgroundColor;
    const opacity = numberValue(hover.opacity, 0, 1);
    if (opacity !== undefined) result.hover.opacity = opacity;
    if (Object.keys(result.hover).length === 0) delete result.hover;
  }

  const border = record(source.border);
  if (border) {
    result.border = {};
    const borderType = enumValue(border.type, ["default", "none", "solid", "double", "dotted", "dashed", "groove"] as const);
    if (borderType) result.border.type = borderType;
    const borderColor = colorValue(border.color);
    if (borderColor) result.border.color = borderColor;
    result.border.width = responsiveEdges(border.width, 0, 40);
    result.border.radius = responsiveEdges(border.radius, 0, 300);
    const shadow = record(border.shadow);
    if (shadow) {
      result.border.shadow = {};
      const shadowColor = colorValue(shadow.color);
      if (shadowColor) result.border.shadow.color = shadowColor;
      for (const key of ["horizontal", "vertical", "blur", "spread"] as const) {
        const next = numberValue(shadow[key], -200, 300);
        if (next !== undefined) result.border.shadow[key] = Math.round(next);
      }
      const shadowPosition = enumValue(shadow.position, ["outline", "inset"] as const);
      if (shadowPosition) result.border.shadow.position = shadowPosition;
      if (Object.keys(result.border.shadow).length === 0) delete result.border.shadow;
    }
    if (Object.keys(result.border).length === 0) delete result.border;
  }

  const mask = record(source.mask);
  if (mask) {
    result.mask = {};
    if (typeof mask.enabled === "boolean") result.mask.enabled = mask.enabled;
    const shape = enumValue(mask.shape, ["circle", "oval", "pill", "pill-vertical", "triangle", "diamond", "hexagon", "blob", "custom"] as const);
    if (shape) result.mask.shape = shape;
    const image = imageValue(mask.image);
    if (image) result.mask.image = image;
    if (Object.keys(result.mask).length === 0) delete result.mask;
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

const containerModes = ["flex", "grid"] as const;
const containerContentWidths = ["boxed", "full"] as const;
const containerSpacing = ["global", "custom"] as const;
const containerMeasureUnits = ["px", "%", "em", "rem", "vw", "vh"] as const;
const containerDirections = ["row", "column", "row-reverse", "column-reverse"] as const;
const containerJustifyValues = ["start", "center", "end", "space-between", "space-around", "space-evenly"] as const;
const containerAlignValues = ["start", "center", "end", "stretch"] as const;
const containerWrapValues = ["nowrap", "wrap"] as const;

export function normalizePageBlockLayout(input: unknown): PageBlockLayout | undefined {
  const source = record(input);
  if (!source) return undefined;
  const result: PageBlockLayout = {};
  const mode = enumValue(source.mode, containerModes);
  const contentWidth = enumValue(source.contentWidth, containerContentWidths);
  const spacing = enumValue(source.spacing, containerSpacing);
  const widthUnit = enumValue(source.widthUnit, containerMeasureUnits);
  const minHeightUnit = enumValue(source.minHeightUnit, containerMeasureUnits);
  const direction = enumValue(source.direction, containerDirections);
  const justifyContent = enumValue(source.justifyContent, containerJustifyValues);
  const alignItems = enumValue(source.alignItems, containerAlignValues);
  const wrap = enumValue(source.wrap, containerWrapValues);
  const autoFlow = enumValue(source.autoFlow, ["row", "column"] as const);
  const justifyItems = enumValue(source.justifyItems, containerAlignValues);
  if (mode) result.mode = mode;
  if (contentWidth) result.contentWidth = contentWidth;
  if (spacing) result.spacing = spacing;
  if (widthUnit) result.widthUnit = widthUnit;
  if (minHeightUnit) result.minHeightUnit = minHeightUnit;
  if (direction) result.direction = direction;
  if (justifyContent) result.justifyContent = justifyContent;
  if (alignItems) result.alignItems = alignItems;
  if (wrap) result.wrap = wrap;
  if (autoFlow) result.autoFlow = autoFlow;
  if (justifyItems) result.justifyItems = justifyItems;
  const width = numberValue(source.width, 0, 3_000);
  const minHeight = numberValue(source.minHeight, 0, 3_000);
  const columnGap = numberValue(source.columnGap, 0, 300);
  const rowGap = numberValue(source.rowGap, 0, 300);
  const columns = numberValue(source.columns, 1, 6);
  const rows = numberValue(source.rows, 1, 12);
  if (width !== undefined) result.width = Math.round(width);
  if (minHeight !== undefined) result.minHeight = Math.round(minHeight);
  if (columnGap !== undefined) result.columnGap = Math.round(columnGap);
  if (rowGap !== undefined) result.rowGap = Math.round(rowGap);
  if (columns !== undefined) result.columns = Math.round(columns);
  if (rows !== undefined) result.rows = Math.round(rows);
  if (typeof source.gridOutline === "boolean") result.gridOutline = source.gridOutline;
  return Object.keys(result).length > 0 ? result : undefined;
}

function setResponsiveVariable(target: Record<string, string>, prefix: string, values: PageStyleNumber | undefined, format: (value: number) => string) {
  if (!values) return;
  for (const device of deviceKeys) {
    const value = values[device];
    if (value !== undefined) target[`${prefix}-${device}`] = format(value);
  }
}

function setResponsiveEdgeVariables(target: Record<string, string>, prefix: string, values: PageStyleBox | undefined, format: (value: number) => string) {
  if (!values) return;
  for (const device of deviceKeys) {
    const value = values[device];
    if (!value) continue;
    for (const edge of ["top", "right", "bottom", "left"] as const) {
      if (value[edge] !== undefined) target[`${prefix}-${edge}-${device}`] = format(value[edge]);
    }
  }
}

function cssUrl(value: string): string { return `url("${value.replace(/["\\]/g, "")}")`; }

const maskClipPaths: Record<string, string> = {
  circle: "circle(50% at 50% 50%)",
  oval: "ellipse(50% 50% at 50% 50%)",
  pill: "inset(0 round 999px)",
  "pill-vertical": "inset(0 30% round 999px)",
  triangle: "polygon(50% 0, 100% 100%, 0 100%)",
  diamond: "polygon(50% 0, 100% 50%, 50% 100%, 0 50%)",
  hexagon: "polygon(25% 0, 75% 0, 100% 50%, 75% 100%, 25% 100%, 0 50%)",
  blob: "polygon(6% 20%, 25% 4%, 52% 8%, 82% 0, 98% 24%, 91% 57%, 100% 84%, 70% 96%, 43% 88%, 13% 100%, 0 69%)",
};

export function pageBlockStyleToCss(input: PageBlockStyle | undefined): Record<string, string> {
  const style = normalizePageBlockStyle(input);
  if (!style) return {};
  const css: Record<string, string> = {};
  if (style.widthMode) {
    css["--block-width-mode"] = style.widthMode;
    if (style.widthMode === "full" || style.widthMode === "inline") {
      const width = style.widthMode === "full" ? "100%" : "auto";
      for (const device of deviceKeys) css[`--block-width-${device}`] = width;
    }
  }
  setResponsiveVariable(css, "--block-width", style.width, (value) => `${value}%`);
  setResponsiveVariable(css, "--block-max-width", style.maxWidth, (value) => `${value}%`);
  setResponsiveVariable(css, "--block-height", style.height, (value) => `${value}px`);
  setResponsiveVariable(css, "--block-opacity", style.opacity, (value) => String(value));
  if (style.alignSelf) css["--block-align-self"] = style.alignSelf === "default" ? "auto" : style.alignSelf === "center" ? "center" : style.alignSelf === "end" ? "end" : style.alignSelf === "stretch" ? "stretch" : "start";
  if (style.position) css["--block-position"] = style.position === "default" ? "static" : style.position;
  if (style.zIndex !== undefined) css["--block-z-index"] = String(style.zIndex);
  setResponsiveEdgeVariables(css, "--block-margin", style.margin, (value) => `${value}px`);
  setResponsiveEdgeVariables(css, "--block-padding", style.padding, (value) => `${value}px`);

  const typography = style.typography;
  if (typography) {
    if (typography.fontFamily && typography.fontFamily !== "default") css["--block-font-family"] = typography.fontFamily.includes(" ") ? `"${typography.fontFamily}"` : typography.fontFamily;
    setResponsiveVariable(css, "--block-font-size", typography.fontSize, (value) => `${value}px`);
    if (typography.fontWeight !== undefined) css["--block-font-weight"] = String(typography.fontWeight);
    if (typography.textTransform) css["--block-text-transform"] = typography.textTransform;
    if (typography.fontStyle) css["--block-font-style"] = typography.fontStyle;
    if (typography.textDecoration) css["--block-text-decoration"] = typography.textDecoration;
    setResponsiveVariable(css, "--block-line-height", typography.lineHeight, String);
    setResponsiveVariable(css, "--block-letter-spacing", typography.letterSpacing, (value) => `${value}px`);
    setResponsiveVariable(css, "--block-word-spacing", typography.wordSpacing, (value) => `${value}px`);
    if (typography.textAlign) css["--block-text-align"] = typography.textAlign;
  }

  const background = style.background;
  if (background) {
    if (background.mode === "classic") {
      if (background.color) css["--block-background-color"] = background.color;
      if (background.image) css["--block-background-image-desktop"] = cssUrl(background.image);
      if (background.imageSize) css["--block-background-size"] = background.imageSize;
      if (background.imagePosition) css["--block-background-position"] = background.imagePosition;
      if (background.imageRepeat) css["--block-background-repeat"] = background.imageRepeat;
    }
    if (background.mode === "gradient") {
      const start = background.gradientStart ?? "#183b36";
      const end = background.gradientEnd ?? "#d8f1ea";
      const startLocation = background.gradientStartLocation ?? 0;
      const endLocation = background.gradientEndLocation ?? 100;
      const type = background.gradientType === "radial" ? "radial-gradient(circle, " : "linear-gradient(";
      for (const device of deviceKeys) {
        const angle = background.angle?.[device] ?? background.angle?.desktop ?? 135;
        const prefix = background.gradientType === "radial" ? type : `${type}${angle}deg, `;
        css[`--block-background-image-${device}`] = `${prefix}${start} ${startLocation}%, ${end} ${endLocation}%)`;
      }
    }
  }

  if (style.hover) {
    if (style.hover.textColor) css["--block-hover-text-color"] = style.hover.textColor;
    if (style.hover.backgroundColor) css["--block-hover-background-color"] = style.hover.backgroundColor;
    if (style.hover.opacity !== undefined) css["--block-hover-opacity"] = String(style.hover.opacity);
  }

  const border = style.border;
  if (border) {
    if (border.type && border.type !== "default") css["--block-border-style"] = border.type;
    if (border.color) css["--block-border-color"] = border.color;
    setResponsiveEdgeVariables(css, "--block-border-width", border.width, (value) => `${value}px`);
    setResponsiveEdgeVariables(css, "--block-border-radius", border.radius, (value) => `${value}px`);
    if (border.shadow) {
      const horizontal = border.shadow.horizontal ?? 0;
      const vertical = border.shadow.vertical ?? 0;
      const blur = border.shadow.blur ?? 0;
      const spread = border.shadow.spread ?? 0;
      const color = border.shadow.color ?? "rgba(24, 59, 54, .14)";
      css["--block-box-shadow"] = `${border.shadow.position === "inset" ? "inset " : ""}${horizontal}px ${vertical}px ${blur}px ${spread}px ${color}`;
    }
  }
  if (style.mask?.enabled) {
    const shape = style.mask.shape ?? "circle";
    if (shape === "custom" && style.mask.image) css["--block-mask-image"] = cssUrl(style.mask.image);
    else if (maskClipPaths[shape]) css["--block-clip-path"] = maskClipPaths[shape];
  }
  return css;
}

const cssJustify: Record<PageContainerJustify, string> = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  "space-between": "space-between",
  "space-around": "space-around",
  "space-evenly": "space-evenly",
};

const cssAlign: Record<PageContainerAlign, string> = { start: "start", center: "center", end: "end", stretch: "stretch" };

export function pageBlockLayoutToCss(input: PageBlockLayout | undefined): Record<string, string> {
  const layout = normalizePageBlockLayout(input);
  if (!layout) return {};
  const css: Record<string, string> = {};
  const mode: PageContainerMode = layout.mode ?? "flex";
  const contentWidth: PageContainerContentWidth = layout.contentWidth ?? "boxed";
  const spacing: PageContainerSpacing = layout.spacing ?? (layout.columnGap === undefined && layout.rowGap === undefined ? "global" : "custom");
  const direction: PageContainerDirection = layout.direction ?? "column";
  const wrap: PageContainerWrap = layout.wrap ?? "nowrap";
  css["--container-display"] = mode === "grid" ? "grid" : "flex";
  css["--container-content-width"] = contentWidth === "full" ? "100%" : "min(100%, 1200px)";
  css["--container-direction"] = direction;
  css["--container-justify-content"] = cssJustify[layout.justifyContent ?? "start"];
  css["--container-align-items"] = cssAlign[layout.alignItems ?? "stretch"];
  css["--container-justify-items"] = cssAlign[layout.justifyItems ?? "stretch"];
  css["--container-wrap"] = wrap;
  css["--container-auto-flow"] = layout.autoFlow ?? "row";
  css["--container-columns"] = String(Math.round(layout.columns ?? 2));
  css["--container-rows"] = String(Math.round(layout.rows ?? 1));
  css["--container-column-gap"] = layout.columnGap === undefined ? "var(--global-column-gap, 24px)" : `${Math.round(layout.columnGap)}px`;
  css["--container-row-gap"] = layout.rowGap === undefined ? "var(--global-row-gap, 24px)" : `${Math.round(layout.rowGap)}px`;
  css["--container-margin-top"] = spacing === "global" ? "0px" : "0px";
  css["--container-margin-right"] = spacing === "global" ? "0px" : "0px";
  css["--container-margin-bottom"] = spacing === "global" ? "0px" : "0px";
  css["--container-margin-left"] = spacing === "global" ? "0px" : "0px";
  css["--container-padding-top"] = spacing === "global" ? "var(--container-padding, 24px)" : "0px";
  css["--container-padding-right"] = spacing === "global" ? "var(--container-padding, 24px)" : "0px";
  css["--container-padding-bottom"] = spacing === "global" ? "var(--container-padding, 24px)" : "0px";
  css["--container-padding-left"] = spacing === "global" ? "var(--container-padding, 24px)" : "0px";
  if (layout.width !== undefined) css["--container-width"] = `${layout.width}${layout.widthUnit ?? "px"}`;
  if (layout.minHeight !== undefined) css["--container-min-height"] = `${layout.minHeight}${layout.minHeightUnit ?? "px"}`;
  if (layout.gridOutline) css["--container-grid-outline"] = "1px dashed rgba(24, 59, 54, .28)";
  return css;
}
