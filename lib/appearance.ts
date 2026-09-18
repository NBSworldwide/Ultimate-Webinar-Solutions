import type { CSSProperties } from "react";
import { cache } from "react";
import { randomUUID } from "node:crypto";
import { assertStandaloneDataset, getDb, type DatabaseClient, type DatabaseRow } from "@/lib/db";
import { DomainError } from "@/lib/errors";
import type { AppearanceSettings, GlobalColorToken, GlobalTypographyToken } from "@/lib/types";

export interface AppearanceSettingsInput {
  contentWidth: number;
  containerPadding: number;
  columnGap: number;
  rowGap: number;
  pageTitleSelector: string;
  stretchSections: boolean;
  defaultPageLayout: "full_width" | "boxed";
  breakpoints: Record<string, number>;
  customCss: string;
}

export interface ColorTokenInput {
  id?: string;
  tokenKey?: string;
  name: string;
  value: string;
  isSystem?: boolean;
  sortOrder?: number;
}

export interface TypographyTokenInput {
  id?: string;
  tokenKey?: string;
  name: string;
  fontFamily: string;
  fontWeight: number;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  textTransform: GlobalTypographyToken["textTransform"];
  fontStyle: GlobalTypographyToken["fontStyle"];
  responsive: GlobalTypographyToken["responsive"];
  isSystem?: boolean;
  sortOrder?: number;
}

export interface AppearanceBundle {
  settings: AppearanceSettings;
  colors: GlobalColorToken[];
  typography: GlobalTypographyToken[];
}

const DEFAULT_BREAKPOINTS = { widescreen: 1600, desktop: 1200, laptop: 1024, tablet: 768, mobile: 480 };

export const DEFAULT_APPEARANCE_SETTINGS: AppearanceSettings = {
  id: "default",
  contentWidth: 1180,
  containerPadding: 24,
  columnGap: 24,
  rowGap: 24,
  pageTitleSelector: "h1",
  stretchSections: true,
  defaultPageLayout: "full_width",
  breakpoints: DEFAULT_BREAKPOINTS,
  customCss: "",
  updatedBy: null,
  updatedAt: "",
};

type AppearanceRow = DatabaseRow & {
  id: string;
  content_width: number | string;
  container_padding: number | string;
  column_gap: number | string;
  row_gap: number | string;
  page_title_selector: string;
  stretch_sections: boolean | number;
  default_page_layout: AppearanceSettings["defaultPageLayout"];
  breakpoints_json: string;
  custom_css: string;
  updated_by: string | null;
  updated_at: string;
};

type ColorRow = DatabaseRow & {
  id: string;
  token_key: string;
  name: string;
  value: string;
  is_system: boolean | number;
  sort_order: number | string;
  updated_at: string;
};

type TypographyRow = DatabaseRow & {
  id: string;
  token_key: string;
  name: string;
  font_family: string;
  font_weight: number | string;
  font_size: number | string;
  line_height: number | string;
  letter_spacing: number | string;
  text_transform: GlobalTypographyToken["textTransform"];
  font_style: GlobalTypographyToken["fontStyle"];
  responsive_json: string;
  is_system: boolean | number;
  sort_order: number | string;
  updated_at: string;
};

function parseJson<T>(value: string, fallback: T): T {
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed as T;
  } catch {
    return fallback;
  }
}

function toAppearance(row: AppearanceRow | undefined): AppearanceSettings {
  if (!row) return DEFAULT_APPEARANCE_SETTINGS;
  const raw = parseJson<Record<string, unknown>>(row.breakpoints_json, DEFAULT_BREAKPOINTS);
  const breakpoints: Record<string, number> = { ...DEFAULT_BREAKPOINTS };
  for (const key of Object.keys(DEFAULT_BREAKPOINTS)) {
    const value = raw[key];
    if (typeof value === "number" && Number.isFinite(value)) breakpoints[key] = Math.round(Math.min(2400, Math.max(320, value)));
  }
  return {
    id: row.id,
    contentWidth: Number(row.content_width),
    containerPadding: Number(row.container_padding),
    columnGap: Number(row.column_gap),
    rowGap: Number(row.row_gap),
    pageTitleSelector: row.page_title_selector,
    stretchSections: Boolean(row.stretch_sections),
    defaultPageLayout: row.default_page_layout,
    breakpoints,
    customCss: row.custom_css,
    updatedBy: row.updated_by,
    updatedAt: row.updated_at,
  };
}

function toColor(row: ColorRow): GlobalColorToken {
  return { id: row.id, tokenKey: row.token_key, name: row.name, value: row.value, isSystem: Boolean(row.is_system), sortOrder: Number(row.sort_order), updatedAt: row.updated_at };
}

function toTypography(row: TypographyRow): GlobalTypographyToken {
  const raw = parseJson<Record<string, unknown>>(row.responsive_json, {});
  const responsive: GlobalTypographyToken["responsive"] = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    const item = value as Record<string, unknown>;
    const next: NonNullable<GlobalTypographyToken["responsive"][string]> = {};
    if (typeof item.fontSize === "number" && Number.isFinite(item.fontSize)) next.fontSize = item.fontSize;
    if (typeof item.lineHeight === "number" && Number.isFinite(item.lineHeight)) next.lineHeight = item.lineHeight;
    if (typeof item.letterSpacing === "number" && Number.isFinite(item.letterSpacing)) next.letterSpacing = item.letterSpacing;
    if (Object.keys(next).length > 0) responsive[key] = next;
  }
  return {
    id: row.id,
    tokenKey: row.token_key,
    name: row.name,
    fontFamily: row.font_family,
    fontWeight: Number(row.font_weight),
    fontSize: Number(row.font_size),
    lineHeight: Number(row.line_height),
    letterSpacing: Number(row.letter_spacing),
    textTransform: row.text_transform,
    fontStyle: row.font_style,
    responsive,
    isSystem: Boolean(row.is_system),
    sortOrder: Number(row.sort_order),
    updatedAt: row.updated_at,
  };
}

const appearanceFields = `id, content_width, container_padding, column_gap, row_gap, page_title_selector,
  stretch_sections, default_page_layout, breakpoints_json, custom_css, updated_by, updated_at`;
const colorFields = "id, token_key, name, value, is_system, sort_order, updated_at";
const typographyFields = `id, token_key, name, font_family, font_weight, font_size, line_height, letter_spacing,
  text_transform, font_style, responsive_json, is_system, sort_order, updated_at`;

export async function readAppearance(database: Pick<DatabaseClient, "query">): Promise<AppearanceBundle> {
  const [appearanceResult, colorResult, typographyResult] = await Promise.all([
    database.query<AppearanceRow>(`SELECT ${appearanceFields} FROM appearance_settings WHERE id = 'default'`),
    database.query<ColorRow>(`SELECT ${colorFields} FROM global_color_tokens ORDER BY is_system DESC, sort_order, name`),
    database.query<TypographyRow>(`SELECT ${typographyFields} FROM global_typography_tokens ORDER BY is_system DESC, sort_order, name`),
  ]);
  return {
    settings: toAppearance(appearanceResult.rows[0]),
    colors: colorResult.rows.map(toColor),
    typography: typographyResult.rows.map(toTypography),
  };
}

export const getAppearance = cache(async (): Promise<AppearanceBundle> => {
  await assertStandaloneDataset();
  return readAppearance(getDb());
});

const localFontFamilies = new Set(["Manrope", "DM Sans", "DM Mono", "Garamond", "Arial", "Georgia", "Verdana", "system-ui"]);
const tokenKeyPattern = /^[a-z][a-z0-9-]{1,79}$/;
const hexColorPattern = /^#[0-9a-f]{6}$/i;
const textTransforms = ["none", "uppercase", "lowercase", "capitalize"] as const;
const fontStyles = ["normal", "italic", "oblique"] as const;

function slugToken(value: string, prefix: string): string {
  const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 62);
  return `${prefix}-${slug || "custom"}-${randomUUID().slice(0, 8)}`;
}

function normalizedTokenKey(value: string | undefined, name: string, prefix: string): string {
  const candidate = value?.trim().toLowerCase() || slugToken(name, prefix);
  if (!tokenKeyPattern.test(candidate)) throw new DomainError("Token keys must use lowercase letters, numbers, and hyphens.");
  return candidate;
}

function normalizedResponsive(value: unknown): GlobalTypographyToken["responsive"] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const result: GlobalTypographyToken["responsive"] = {};
  for (const [breakpoint, raw] of Object.entries(value)) {
    if (!/^[a-z][a-z0-9-]{0,30}$/.test(breakpoint) || !raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const input = raw as Record<string, unknown>;
    const next: NonNullable<GlobalTypographyToken["responsive"][string]> = {};
    for (const key of ["fontSize", "lineHeight", "letterSpacing"] as const) {
      const number = input[key];
      if (typeof number === "number" && Number.isFinite(number)) {
        const ranges = { fontSize: [6, 160], lineHeight: [0.5, 4], letterSpacing: [-20, 40] } as const;
        next[key] = Math.min(ranges[key][1], Math.max(ranges[key][0], number));
      }
    }
    if (Object.keys(next).length > 0) result[breakpoint] = next;
  }
  return result;
}

export function validateAppearanceSettings(input: AppearanceSettingsInput): AppearanceSettingsInput {
  if (!Number.isInteger(input.contentWidth) || input.contentWidth < 960 || input.contentWidth > 1600) throw new DomainError("Content width must be between 960 and 1600 pixels.");
  if (!Number.isInteger(input.containerPadding) || input.containerPadding < 0 || input.containerPadding > 160) throw new DomainError("Container padding must be between 0 and 160 pixels.");
  if (!Number.isInteger(input.columnGap) || input.columnGap < 0 || input.columnGap > 300) throw new DomainError("Column gap must be between 0 and 300 pixels.");
  if (!Number.isInteger(input.rowGap) || input.rowGap < 0 || input.rowGap > 300) throw new DomainError("Row gap must be between 0 and 300 pixels.");
  if (!/^(?:h[1-6]|div|span|p)$/.test(input.pageTitleSelector)) throw new DomainError("Choose a supported page-title selector.");
  if (!(input.defaultPageLayout === "full_width" || input.defaultPageLayout === "boxed")) throw new DomainError("Choose a supported default page layout.");
  const breakpoints: AppearanceSettings["breakpoints"] = { ...DEFAULT_BREAKPOINTS };
  for (const key of Object.keys(DEFAULT_BREAKPOINTS) as Array<keyof AppearanceSettings["breakpoints"]>) {
    const value = input.breakpoints[key];
    if (!Number.isInteger(value) || value < 320 || value > 2400) throw new DomainError("Responsive breakpoints must be whole pixels between 320 and 2400.");
    breakpoints[key] = value;
  }
  return { ...input, customCss: sanitizeCustomCss(input.customCss), breakpoints };
}

export function normalizeColorTokens(input: ColorTokenInput[], existingSystem: Map<string, string>): ColorTokenInput[] {
  if (!Array.isArray(input) || input.length > 80) throw new DomainError("Keep the global color library to 80 tokens or fewer.");
  const keys = new Set<string>();
  return input.map((candidate, index) => {
    const tokenKey = normalizedTokenKey(candidate.tokenKey, candidate.name, "color");
    if (keys.has(tokenKey)) throw new DomainError("Each global color token needs a unique key.");
    keys.add(tokenKey);
    const name = candidate.name.trim().slice(0, 80);
    if (name.length < 2) throw new DomainError(`Color ${index + 1} needs a name.`);
    if (!hexColorPattern.test(candidate.value.trim())) throw new DomainError(`Color ${name} must use a six-digit hexadecimal value.`);
    const existing = candidate.id ? existingSystem.get(candidate.id) : undefined;
    return {
      id: candidate.id,
      tokenKey,
      name,
      value: candidate.value.trim().toLowerCase(),
      isSystem: Boolean(existing),
      sortOrder: Number.isInteger(candidate.sortOrder) ? Math.max(0, Math.min(999, candidate.sortOrder as number)) : index,
    };
  });
}

export function normalizeTypographyTokens(input: TypographyTokenInput[], existingSystem: Map<string, string>): TypographyTokenInput[] {
  if (!Array.isArray(input) || input.length > 80) throw new DomainError("Keep the global typography library to 80 styles or fewer.");
  const keys = new Set<string>();
  return input.map((candidate, index) => {
    const tokenKey = normalizedTokenKey(candidate.tokenKey, candidate.name, "type");
    if (keys.has(tokenKey)) throw new DomainError("Each global typography style needs a unique key.");
    keys.add(tokenKey);
    const name = candidate.name.trim().slice(0, 80);
    if (name.length < 2) throw new DomainError(`Typography style ${index + 1} needs a name.`);
    if (!localFontFamilies.has(candidate.fontFamily)) throw new DomainError(`The font family for ${name} is not available locally.`);
    if (!Number.isInteger(candidate.fontWeight) || candidate.fontWeight < 100 || candidate.fontWeight > 900) throw new DomainError(`The font weight for ${name} is invalid.`);
    if (!Number.isFinite(candidate.fontSize) || candidate.fontSize < 6 || candidate.fontSize > 160) throw new DomainError(`The font size for ${name} is invalid.`);
    if (!Number.isFinite(candidate.lineHeight) || candidate.lineHeight < 0.5 || candidate.lineHeight > 4) throw new DomainError(`The line height for ${name} is invalid.`);
    if (!Number.isFinite(candidate.letterSpacing) || candidate.letterSpacing < -20 || candidate.letterSpacing > 40) throw new DomainError(`The letter spacing for ${name} is invalid.`);
    if (!textTransforms.includes(candidate.textTransform) || !fontStyles.includes(candidate.fontStyle)) throw new DomainError(`The text style for ${name} is invalid.`);
    const existing = candidate.id ? existingSystem.get(candidate.id) : undefined;
    return {
      id: candidate.id,
      tokenKey,
      name,
      fontFamily: candidate.fontFamily,
      fontWeight: Math.round(candidate.fontWeight / 100) * 100,
      fontSize: candidate.fontSize,
      lineHeight: candidate.lineHeight,
      letterSpacing: candidate.letterSpacing,
      textTransform: candidate.textTransform,
      fontStyle: candidate.fontStyle,
      responsive: normalizedResponsive(candidate.responsive),
      isSystem: Boolean(existing),
      sortOrder: Number.isInteger(candidate.sortOrder) ? Math.max(0, Math.min(999, candidate.sortOrder as number)) : index,
    };
  });
}

export async function updateAppearance(bundle: { settings: AppearanceSettingsInput; colors: ColorTokenInput[]; typography: TypographyTokenInput[] }, actorId: string): Promise<AppearanceBundle> {
  await assertStandaloneDataset();
  const settings = validateAppearanceSettings(bundle.settings);
  const database = getDb();
  const client = await database.connect();
  try {
    await client.query("BEGIN");
    const [systemColors, systemTypography] = await Promise.all([
      client.query<{ id: string }>("SELECT id FROM global_color_tokens WHERE is_system = TRUE"),
      client.query<{ id: string }>("SELECT id FROM global_typography_tokens WHERE is_system = TRUE"),
    ]);
    const colorSystems = new Map(systemColors.rows.map((row) => [row.id, row.id]));
    const typographySystems = new Map(systemTypography.rows.map((row) => [row.id, row.id]));
    const colors = normalizeColorTokens(bundle.colors, colorSystems);
    const typography = normalizeTypographyTokens(bundle.typography, typographySystems);
    await client.query(`UPDATE appearance_settings SET content_width=$1, container_padding=$2, column_gap=$3, row_gap=$4, page_title_selector=$5, stretch_sections=$6, default_page_layout=$7, breakpoints_json=$8, custom_css=$9, updated_by=$10, updated_at=$11 WHERE id='default'`, [settings.contentWidth, settings.containerPadding, settings.columnGap, settings.rowGap, settings.pageTitleSelector, settings.stretchSections, settings.defaultPageLayout, JSON.stringify(settings.breakpoints), settings.customCss, actorId, new Date().toISOString()]);
    await client.query("DELETE FROM global_color_tokens WHERE is_system = FALSE");
    await client.query("DELETE FROM global_typography_tokens WHERE is_system = FALSE");
    for (const color of colors) {
      await client.query(`INSERT INTO global_color_tokens (id, token_key, name, value, is_system, sort_order, created_by, updated_by, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9) ON CONFLICT (id) DO UPDATE SET token_key=EXCLUDED.token_key, name=EXCLUDED.name, value=EXCLUDED.value, is_system=EXCLUDED.is_system, sort_order=EXCLUDED.sort_order, updated_by=EXCLUDED.updated_by, updated_at=EXCLUDED.updated_at`, [color.id ?? randomUUID(), color.tokenKey, color.name, color.value, color.isSystem ?? false, color.sortOrder ?? 0, actorId, actorId, new Date().toISOString()]);
    }
    for (const type of typography) {
      await client.query(`INSERT INTO global_typography_tokens (id, token_key, name, font_family, font_weight, font_size, line_height, letter_spacing, text_transform, font_style, responsive_json, is_system, sort_order, created_by, updated_by, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$16) ON CONFLICT (id) DO UPDATE SET token_key=EXCLUDED.token_key, name=EXCLUDED.name, font_family=EXCLUDED.font_family, font_weight=EXCLUDED.font_weight, font_size=EXCLUDED.font_size, line_height=EXCLUDED.line_height, letter_spacing=EXCLUDED.letter_spacing, text_transform=EXCLUDED.text_transform, font_style=EXCLUDED.font_style, responsive_json=EXCLUDED.responsive_json, is_system=EXCLUDED.is_system, sort_order=EXCLUDED.sort_order, updated_by=EXCLUDED.updated_by, updated_at=EXCLUDED.updated_at`, [type.id ?? randomUUID(), type.tokenKey, type.name, type.fontFamily, type.fontWeight, type.fontSize, type.lineHeight, type.letterSpacing, type.textTransform, type.fontStyle, JSON.stringify(type.responsive), type.isSystem ?? false, type.sortOrder ?? 0, actorId, actorId, new Date().toISOString()]);
    }
    await client.query("INSERT INTO audit_events (id, actor_id, event_type, entity_type, entity_id, metadata_json, created_at) VALUES ($1,$2,'appearance.updated','appearance_settings','default',$3,$4)", [randomUUID(), actorId, JSON.stringify({ synthetic: true, colorCount: colors.length, typographyCount: typography.length }), new Date().toISOString()]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
  return readAppearance(database);
}

export function sanitizeCustomCss(value: string): string {
  return value
    .replace(/<\/?style[^>]*>/gi, "")
    .replace(/@import\b[^;]+;?/gi, "")
    .replace(/(?:expression|behavior|-moz-binding|javascript\s*:|vbscript\s*:)/gi, "")
    .replace(/url\s*\(\s*["']?\s*(?:javascript|data):[^)]*\)/gi, "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .slice(0, 50_000);
}

export function appearanceCssVariables(bundle: AppearanceBundle): CSSProperties {
  const variables: Record<string, string> = {
    "--content-width": `${bundle.settings.contentWidth}px`,
    "--container-padding": `${bundle.settings.containerPadding}px`,
    "--global-column-gap": `${bundle.settings.columnGap}px`,
    "--global-row-gap": `${bundle.settings.rowGap}px`,
    "--page-title-selector": bundle.settings.pageTitleSelector,
    "--default-page-layout": bundle.settings.defaultPageLayout,
    "--stretch-sections": bundle.settings.stretchSections ? "1" : "0",
  };
  for (const [key, value] of Object.entries(bundle.settings.breakpoints)) variables[`--breakpoint-${key}`] = `${value}px`;
  for (const token of bundle.colors) variables[`--${token.tokenKey}`] = token.value;
  const heading = bundle.typography.find((token) => token.tokenKey === "type-heading");
  const body = bundle.typography.find((token) => token.tokenKey === "type-body");
  if (heading) variables["--heading-font"] = `'${heading.fontFamily}', sans-serif`;
  if (body) variables["--body-font"] = `'${body.fontFamily}', sans-serif`;
  for (const token of bundle.typography) {
    variables[`--${token.tokenKey}-family`] = `'${token.fontFamily}', sans-serif`;
    variables[`--${token.tokenKey}-size`] = `${token.fontSize}px`;
    variables[`--${token.tokenKey}-line-height`] = String(token.lineHeight);
    variables[`--${token.tokenKey}-letter-spacing`] = `${token.letterSpacing}px`;
    variables[`--${token.tokenKey}-weight`] = String(token.fontWeight);
  }
  return variables as CSSProperties;
}

export function appearanceResponsiveCss(bundle: AppearanceBundle): string {
  const rules: string[] = [];
  for (const token of bundle.typography) {
    const selector = `.appearance-token-${token.tokenKey}`;
    rules.push(`${selector}{font-family:var(--${token.tokenKey}-family);font-size:var(--${token.tokenKey}-size);line-height:var(--${token.tokenKey}-line-height);letter-spacing:var(--${token.tokenKey}-letter-spacing);font-weight:var(--${token.tokenKey}-weight);text-transform:${token.textTransform};font-style:${token.fontStyle}}`);
    for (const [breakpoint, values] of Object.entries(token.responsive)) {
      const bp = bundle.settings.breakpoints[breakpoint as keyof typeof bundle.settings.breakpoints];
      if (!bp) continue;
      const declarations = [values.fontSize !== undefined ? `font-size:${values.fontSize}px` : "", values.lineHeight !== undefined ? `line-height:${values.lineHeight}` : "", values.letterSpacing !== undefined ? `letter-spacing:${values.letterSpacing}px` : ""].filter(Boolean).join(";");
      if (declarations) rules.push(`@media (max-width:${bp}px){${selector}{${declarations}}}`);
    }
  }
  return rules.join("");
}
