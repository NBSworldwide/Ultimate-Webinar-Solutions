import type { PageBlockLayout, PageBlockLayoutResponsive, PageBlockStyle, PageContainerAlign, PageContainerContentWidth, PageContainerDirection, PageContainerJustify, PageContainerMode, PageContainerSpacing, PageContainerWrap, PageStyleBox, PageStyleDevice, PageStyleEdges, PageStyleNumber, PageStyleResponsiveString } from "@/lib/types";

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

function responsiveStrings<T extends string>(value: unknown, allowed: readonly T[]): PageStyleResponsiveString<T> | undefined {
  const source = record(value);
  if (!source) return undefined;
  const result: PageStyleResponsiveString<T> = {};
  for (const key of deviceKeys) {
    const next = enumValue(source[key], allowed);
    if (next) result[key] = next;
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
  const order = numberValue(source.order, -10_000, 10_000);
  if (order !== undefined) result.order = Math.round(order);
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
    const textStroke = record(typography.textStroke);
    if (textStroke) {
      result.typography.textStroke = {
        width: responsiveNumbers(textStroke.width, 0, 20),
        color: colorValue(textStroke.color),
      };
      if (result.typography.textStroke.width === undefined && result.typography.textStroke.color === undefined) delete result.typography.textStroke;
    }
    const textShadow = record(typography.textShadow);
    if (textShadow) {
      result.typography.textShadow = {
        horizontal: responsiveNumbers(textShadow.horizontal, -200, 200),
        vertical: responsiveNumbers(textShadow.vertical, -200, 200),
        blur: responsiveNumbers(textShadow.blur, 0, 300),
        color: colorValue(textShadow.color),
      };
      if (result.typography.textShadow.horizontal === undefined && result.typography.textShadow.vertical === undefined && result.typography.textShadow.blur === undefined && result.typography.textShadow.color === undefined) delete result.typography.textShadow;
    }
    if (Object.keys(result.typography).length === 0) delete result.typography;
  }

  const background = record(source.background);
  if (background) {
    result.background = {};
    const mode = enumValue(background.mode, ["none", "classic", "gradient", "video", "slideshow"] as const);
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
    const videoSource = enumValue(background.videoSource, ["youtube", "vimeo", "file"] as const);
    if (videoSource) result.background.videoSource = videoSource;
    const videoUrl = imageValue(background.videoUrl);
    if (videoUrl) result.background.videoUrl = videoUrl;
    const videoFallbackImage = imageValue(background.videoFallbackImage);
    if (videoFallbackImage) result.background.videoFallbackImage = videoFallbackImage;
    const videoStart = numberValue(background.videoStart, 0, 86_400);
    const videoEnd = numberValue(background.videoEnd, 0, 86_400);
    if (videoStart !== undefined) result.background.videoStart = Math.round(videoStart);
    if (videoEnd !== undefined) result.background.videoEnd = Math.round(videoEnd);
    if (Array.isArray(background.slideshowImages)) {
      const images = background.slideshowImages.map((value) => imageValue(value)).filter((value): value is string => Boolean(value)).slice(0, 24);
      if (images.length > 0) result.background.slideshowImages = images;
    }
    if (typeof background.slideshowInfinite === "boolean") result.background.slideshowInfinite = background.slideshowInfinite;
    const slideshowDuration = numberValue(background.slideshowDuration, 1_000, 60_000);
    const slideshowTransitionDuration = numberValue(background.slideshowTransitionDuration, 100, 10_000);
    if (slideshowDuration !== undefined) result.background.slideshowDuration = Math.round(slideshowDuration);
    if (slideshowTransitionDuration !== undefined) result.background.slideshowTransitionDuration = Math.round(slideshowTransitionDuration);
    const slideshowTransition = enumValue(background.slideshowTransition, ["fade", "slide"] as const);
    if (slideshowTransition) result.background.slideshowTransition = slideshowTransition;
    if (typeof background.slideshowLazyLoad === "boolean") result.background.slideshowLazyLoad = background.slideshowLazyLoad;
    if (typeof background.slideshowKenBurns === "boolean") result.background.slideshowKenBurns = background.slideshowKenBurns;
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
    result.mask.size = responsiveStrings(mask.size, ["auto", "contain", "cover"] as const);
    result.mask.position = responsiveStrings(mask.position, ["center", "top", "right", "bottom", "left"] as const);
    result.mask.repeat = responsiveStrings(mask.repeat, ["no-repeat", "repeat", "repeat-x", "repeat-y"] as const);
    if (Object.keys(result.mask).length === 0) delete result.mask;
  }

  const widget = record(source.widget);
  if (widget) {
    result.widget = {};
    const aspectRatio = enumValue(widget.aspectRatio, ["1/1", "3/2", "4/3", "16/9", "21/9", "9/16"] as const);
    const imagePosition = enumValue(widget.imagePosition, ["left", "top", "right", "bottom"] as const);
    const imageAlign = enumValue(widget.imageAlign, ["left", "center", "right"] as const);
    if (aspectRatio) result.widget.aspectRatio = aspectRatio;
    if (imagePosition) result.widget.imagePosition = imagePosition;
    if (imageAlign) result.widget.imageAlign = imageAlign;
    for (const key of ["imageSpacing", "contentSpacing"] as const) {
      const value = numberValue(widget[key], 0, 300);
      if (value !== undefined) result.widget[key] = Math.round(value);
    }
    result.widget.imageWidth = responsiveNumbers(widget.imageWidth, 0, 100);
    result.widget.imageHeight = responsiveNumbers(widget.imageHeight, 0, 3_000);
    result.widget.imageOpacity = responsiveNumbers(widget.imageOpacity, 0, 1);
    result.widget.iconSize = responsiveNumbers(widget.iconSize, 8, 240);
    result.widget.iconRotate = responsiveNumbers(widget.iconRotate, -360, 360);
    const iconAlign = enumValue(widget.iconAlign, ["left", "center", "right"] as const);
    if (iconAlign) result.widget.iconAlign = iconAlign;
    const iconColor = colorValue(widget.iconColor);
    if (iconColor) result.widget.iconColor = iconColor;
    const filter = record(widget.filter);
    if (filter) {
      result.widget.filter = {
        blur: responsiveNumbers(filter.blur, 0, 40),
        brightness: responsiveNumbers(filter.brightness, 0, 3),
        contrast: responsiveNumbers(filter.contrast, 0, 3),
        saturation: responsiveNumbers(filter.saturation, 0, 3),
        hue: responsiveNumbers(filter.hue, -180, 180),
      };
      if (Object.values(result.widget.filter).every((value) => value === undefined)) delete result.widget.filter;
    }
    if (Object.values(result.widget).every((value) => value === undefined)) delete result.widget;
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

function normalizePageBlockLayoutResponsive(input: unknown): PageBlockLayoutResponsive | undefined {
  const source = record(input);
  if (!source) return undefined;
  const result: PageBlockLayoutResponsive = {};
  const contentWidth = enumValue(source.contentWidth, containerContentWidths);
  const widthUnit = enumValue(source.widthUnit, containerMeasureUnits);
  const minHeightUnit = enumValue(source.minHeightUnit, containerMeasureUnits);
  const direction = enumValue(source.direction, containerDirections);
  const justifyContent = enumValue(source.justifyContent, containerJustifyValues);
  const alignItems = enumValue(source.alignItems, containerAlignValues);
  const wrap = enumValue(source.wrap, containerWrapValues);
  const autoFlow = enumValue(source.autoFlow, ["row", "column"] as const);
  const justifyItems = enumValue(source.justifyItems, containerAlignValues);
  if (contentWidth) result.contentWidth = contentWidth;
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
  return Object.keys(result).length > 0 ? result : undefined;
}

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
  const overflow = enumValue(source.overflow, ["visible", "hidden", "scroll", "auto"] as const);
  const htmlTag = enumValue(source.htmlTag, ["div", "header", "footer", "main", "article", "section", "aside", "nav", "a"] as const);
  const linkUrl = imageValue(source.linkUrl);
  const linkTarget = enumValue(source.linkTarget, ["same", "new"] as const);
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
  if (overflow) result.overflow = overflow;
  if (htmlTag) result.htmlTag = htmlTag;
  if (linkUrl) result.linkUrl = linkUrl;
  if (linkTarget) result.linkTarget = linkTarget;
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
  const responsive = record(source.responsive);
  if (responsive) {
    const normalized: NonNullable<PageBlockLayout["responsive"]> = {};
    for (const { key } of PAGE_STYLE_DEVICES) {
      const next = normalizePageBlockLayoutResponsive(responsive[key]);
      if (next) normalized[key] = next;
    }
    if (Object.keys(normalized).length > 0) result.responsive = normalized;
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

function setResponsiveVariable(target: Record<string, string>, prefix: string, values: PageStyleNumber | undefined, format: (value: number) => string) {
  if (!values) return;
  for (const device of deviceKeys) {
    const value = values[device];
    if (value !== undefined) target[`${prefix}-${device}`] = format(value);
  }
}

function setResponsiveStringVariable(target: Record<string, string>, prefix: string, values: PageStyleResponsiveString<string> | undefined) {
  if (!values) return;
  for (const device of deviceKeys) {
    const value = values[device];
    if (value) target[`${prefix}-${device}`] = value;
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
  if (style.order !== undefined) css["--block-order"] = String(style.order);
  if (style.alignSelf) css["--block-align-self"] = style.alignSelf === "default" ? "auto" : style.alignSelf === "center" ? "center" : style.alignSelf === "end" ? "end" : style.alignSelf === "stretch" ? "stretch" : "start";
  if (style.position) css["--block-position"] = style.position === "default" ? "static" : style.position;
  if (style.zIndex !== undefined) css["--block-z-index"] = String(style.zIndex);
  setResponsiveEdgeVariables(css, "--block-margin", style.margin, (value) => `${value}px`);
  setResponsiveEdgeVariables(css, "--block-padding", style.padding, (value) => `${value}px`);

  const widget = style.widget;
  if (widget) {
    if (widget.aspectRatio) css["--widget-aspect-ratio"] = widget.aspectRatio.replace("/", " / ");
    if (widget.imagePosition) {
      css["--widget-image-position"] = widget.imagePosition;
      css["--widget-image-grid-template"] = widget.imagePosition === "left" || widget.imagePosition === "right" ? "minmax(0, 1fr) minmax(0, 1fr)" : "minmax(0, 1fr)";
      css["--widget-image-media-order"] = widget.imagePosition === "right" || widget.imagePosition === "bottom" ? "2" : "1";
      css["--widget-image-copy-order"] = widget.imagePosition === "right" || widget.imagePosition === "bottom" ? "1" : "2";
    }
    if (widget.imageAlign) css["--widget-image-align"] = widget.imageAlign;
    if (widget.imageSpacing !== undefined) css["--widget-image-spacing"] = `${widget.imageSpacing}px`;
    if (widget.contentSpacing !== undefined) css["--widget-content-spacing"] = `${widget.contentSpacing}px`;
    setResponsiveVariable(css, "--widget-image-width", widget.imageWidth, (value) => `${value}%`);
    setResponsiveVariable(css, "--widget-image-height", widget.imageHeight, (value) => `${value}px`);
    setResponsiveVariable(css, "--widget-image-opacity", widget.imageOpacity, String);
    setResponsiveVariable(css, "--widget-icon-size", widget.iconSize, (value) => `${value}px`);
    setResponsiveVariable(css, "--widget-icon-rotate", widget.iconRotate, (value) => `${value}deg`);
    if (widget.iconAlign) css["--widget-icon-align"] = widget.iconAlign;
    if (widget.iconColor) css["--widget-icon-color"] = widget.iconColor;
    if (widget.filter) {
      for (const device of deviceKeys) {
        const blur = widget.filter.blur?.[device] ?? widget.filter.blur?.desktop ?? 0;
        const brightness = widget.filter.brightness?.[device] ?? widget.filter.brightness?.desktop ?? 1;
        const contrast = widget.filter.contrast?.[device] ?? widget.filter.contrast?.desktop ?? 1;
        const saturation = widget.filter.saturation?.[device] ?? widget.filter.saturation?.desktop ?? 1;
        const hue = widget.filter.hue?.[device] ?? widget.filter.hue?.desktop ?? 0;
        css[`--widget-filter-${device}`] = `blur(${blur}px) brightness(${brightness}) contrast(${contrast}) saturate(${saturation}) hue-rotate(${hue}deg)`;
      }
    }
  }

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
    if (typography.textStroke) {
      setResponsiveVariable(css, "--block-text-stroke", typography.textStroke.width, (value) => `${value}px`);
      if (typography.textStroke.color) css["--block-text-stroke-color"] = typography.textStroke.color;
    }
    if (typography.textShadow) {
      const shadow = typography.textShadow;
      if (shadow.color) css["--block-text-shadow-color"] = shadow.color;
      setResponsiveVariable(css, "--block-text-shadow-x", shadow.horizontal, (value) => `${value}px`);
      setResponsiveVariable(css, "--block-text-shadow-y", shadow.vertical, (value) => `${value}px`);
      setResponsiveVariable(css, "--block-text-shadow-blur", shadow.blur, (value) => `${value}px`);
    }
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
    setResponsiveStringVariable(css, "--block-mask-size", style.mask.size);
    setResponsiveStringVariable(css, "--block-mask-position", style.mask.position);
    setResponsiveStringVariable(css, "--block-mask-repeat", style.mask.repeat);
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
  css["--container-column-gap"] = layout.columnGap === undefined ? "var(--global-column-gap, 20px)" : `${Math.round(layout.columnGap)}px`;
  css["--container-row-gap"] = layout.rowGap === undefined ? "var(--global-row-gap, 20px)" : `${Math.round(layout.rowGap)}px`;
  css["--container-margin-top"] = spacing === "global" ? "0px" : "0px";
  css["--container-margin-right"] = spacing === "global" ? "0px" : "0px";
  css["--container-margin-bottom"] = spacing === "global" ? "0px" : "0px";
  css["--container-margin-left"] = spacing === "global" ? "0px" : "0px";
  css["--container-padding-top"] = spacing === "global" ? "var(--container-padding, 20px)" : "0px";
  css["--container-padding-right"] = spacing === "global" ? "var(--container-padding, 20px)" : "0px";
  css["--container-padding-bottom"] = spacing === "global" ? "var(--container-padding, 20px)" : "0px";
  css["--container-padding-left"] = spacing === "global" ? "var(--container-padding, 20px)" : "0px";
  if (layout.width !== undefined) css["--container-width"] = `${layout.width}${layout.widthUnit ?? "px"}`;
  if (layout.minHeight !== undefined) css["--container-min-height"] = `${layout.minHeight}${layout.minHeightUnit ?? "px"}`;
  if (layout.gridOutline) css["--container-grid-outline"] = "1px dashed rgba(24, 59, 54, .28)";
  if (layout.overflow) css["--container-overflow"] = layout.overflow;
  for (const { key } of PAGE_STYLE_DEVICES) {
    const override = layout.responsive?.[key];
    if (!override) continue;
    const suffix = `-${key}`;
    if (override.contentWidth) css[`--container-content-width${suffix}`] = override.contentWidth === "full" ? "100%" : "min(100%, 1200px)";
    if (override.direction) css[`--container-direction${suffix}`] = override.direction;
    if (override.justifyContent) css[`--container-justify-content${suffix}`] = cssJustify[override.justifyContent];
    if (override.alignItems) css[`--container-align-items${suffix}`] = cssAlign[override.alignItems];
    if (override.justifyItems) css[`--container-justify-items${suffix}`] = cssAlign[override.justifyItems];
    if (override.wrap) css[`--container-wrap${suffix}`] = override.wrap;
    if (override.autoFlow) css[`--container-auto-flow${suffix}`] = override.autoFlow;
    if (override.columns !== undefined) css[`--container-columns${suffix}`] = String(Math.round(override.columns));
    if (override.rows !== undefined) css[`--container-rows${suffix}`] = String(Math.round(override.rows));
    if (override.columnGap !== undefined) css[`--container-column-gap${suffix}`] = `${Math.round(override.columnGap)}px`;
    if (override.rowGap !== undefined) css[`--container-row-gap${suffix}`] = `${Math.round(override.rowGap)}px`;
    if (override.width !== undefined) css[`--container-width${suffix}`] = `${override.width}${override.widthUnit ?? layout.widthUnit ?? "px"}`;
    if (override.minHeight !== undefined) css[`--container-min-height${suffix}`] = `${override.minHeight}${override.minHeightUnit ?? layout.minHeightUnit ?? "px"}`;
  }
  return css;
}
