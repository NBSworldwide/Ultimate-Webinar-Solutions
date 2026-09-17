import type { CSSProperties } from "react";
import { cache } from "react";
import { randomUUID } from "node:crypto";
import { assertStandaloneDataset, getDb, type DatabaseClient, type DatabaseRow } from "@/lib/db";
import { DomainError } from "@/lib/errors";
import type { ThemeSettings } from "@/lib/types";
import { DEFAULT_THEME_VALUES, THEME_PRESETS, type ThemeFont, type ThemeSettingsValues } from "@/lib/theme-presets";

export type ThemeSettingsInput = ThemeSettingsValues;

export const DEFAULT_THEME_SETTINGS: ThemeSettings = {
  id: "default",
  ...DEFAULT_THEME_VALUES,
  updatedBy: null,
  updatedAt: "",
};

type ThemeSettingsRow = DatabaseRow & {
  id: string;
  preset: ThemeSettingsValues["preset"];
  body_style: ThemeSettingsValues["bodyStyle"];
  content_width: number | string;
  section_spacing: ThemeSettingsValues["sectionSpacing"];
  shop_layout: ThemeSettingsValues["shopLayout"];
  heading_font: ThemeFont;
  body_font: ThemeFont;
  primary_color: string;
  accent_color: string;
  surface_color: string;
  surface_raised_color: string;
  ink_color: string;
  ink_soft_color: string;
  ink_faint_color: string;
  line_color: string;
  card_radius: number | string;
  button_radius: number | string;
  updated_by: string | null;
  updated_at: string;
};

const settingsFields = `id, preset, body_style, content_width, section_spacing, shop_layout,
  heading_font, body_font, primary_color, accent_color, surface_color, surface_raised_color,
  ink_color, ink_soft_color, ink_faint_color, line_color, card_radius, button_radius,
  updated_by, updated_at`;

function toThemeSettings(row: ThemeSettingsRow): ThemeSettings {
  return {
    id: row.id,
    preset: row.preset,
    bodyStyle: row.body_style,
    contentWidth: Number(row.content_width),
    sectionSpacing: row.section_spacing,
    shopLayout: row.shop_layout,
    headingFont: row.heading_font,
    bodyFont: row.body_font,
    primaryColor: row.primary_color,
    accentColor: row.accent_color,
    surfaceColor: row.surface_color,
    surfaceRaisedColor: row.surface_raised_color,
    inkColor: row.ink_color,
    inkSoftColor: row.ink_soft_color,
    inkFaintColor: row.ink_faint_color,
    lineColor: row.line_color,
    cardRadius: Number(row.card_radius),
    buttonRadius: Number(row.button_radius),
    updatedBy: row.updated_by,
    updatedAt: row.updated_at,
  };
}

export async function readThemeSettings(database: Pick<DatabaseClient, "query">): Promise<ThemeSettings> {
  const { rows } = await database.query<ThemeSettingsRow>(`SELECT ${settingsFields} FROM theme_settings WHERE id = 'default'`);
  return rows[0] ? toThemeSettings(rows[0]) : DEFAULT_THEME_SETTINGS;
}

export const getThemeSettings = cache(async (): Promise<ThemeSettings> => {
  await assertStandaloneDataset();
  return readThemeSettings(getDb());
});

const hexColor = /^#[0-9a-f]{6}$/i;
const fontChoices: ThemeFont[] = ["manrope", "dm-sans", "montserrat", "roboto", "karla", "garamond"];

function includes<T extends string>(values: readonly T[], value: string): value is T {
  return values.includes(value as T);
}

export function validateThemeSettings(input: ThemeSettingsInput): ThemeSettingsValues {
  if (!includes(["studio", "honor", "autumn", "green", "custom"], input.preset)) throw new DomainError("Choose a valid theme preset.");
  if (!includes(["fullwide", "wide", "boxed"], input.bodyStyle)) throw new DomainError("Choose a valid body layout.");
  if (!includes(["none", "small", "medium", "large"], input.sectionSpacing)) throw new DomainError("Choose a valid section spacing.");
  if (!includes(["grid", "list"], input.shopLayout)) throw new DomainError("Choose a valid shop layout.");
  if (!fontChoices.includes(input.headingFont) || !fontChoices.includes(input.bodyFont)) throw new DomainError("Choose a supported font preset.");
  const colors = [input.primaryColor, input.accentColor, input.surfaceColor, input.surfaceRaisedColor, input.inkColor, input.inkSoftColor, input.inkFaintColor, input.lineColor];
  if (colors.some((color) => !hexColor.test(color))) throw new DomainError("Use six-digit hexadecimal values for theme colors.");
  if (!Number.isInteger(input.contentWidth) || input.contentWidth < 960 || input.contentWidth > 1440) throw new DomainError("Content width must be between 960 and 1440 pixels.");
  if (!Number.isInteger(input.cardRadius) || input.cardRadius < 0 || input.cardRadius > 32) throw new DomainError("Card radius must be between 0 and 32 pixels.");
  if (!Number.isInteger(input.buttonRadius) || input.buttonRadius < 0 || input.buttonRadius > 32) throw new DomainError("Button radius must be between 0 and 32 pixels.");
  return { ...input, contentWidth: Math.round(input.contentWidth), cardRadius: Math.round(input.cardRadius), buttonRadius: Math.round(input.buttonRadius) };
}

export async function updateThemeSettings(input: ThemeSettingsInput, actorId: string): Promise<ThemeSettings> {
  await assertStandaloneDataset();
  const values = validateThemeSettings(input);
  const now = new Date().toISOString();
  const database = getDb();
  const client = await database.connect();
  try {
    await client.query("BEGIN");
    await client.query(`
      INSERT INTO theme_settings
        (id, preset, body_style, content_width, section_spacing, shop_layout, heading_font, body_font,
         primary_color, accent_color, surface_color, surface_raised_color, ink_color, ink_soft_color,
         ink_faint_color, line_color, card_radius, button_radius, updated_by, updated_at)
      VALUES ('default', $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      ON CONFLICT (id) DO UPDATE SET
        preset = EXCLUDED.preset, body_style = EXCLUDED.body_style, content_width = EXCLUDED.content_width,
        section_spacing = EXCLUDED.section_spacing, shop_layout = EXCLUDED.shop_layout, heading_font = EXCLUDED.heading_font,
        body_font = EXCLUDED.body_font, primary_color = EXCLUDED.primary_color, accent_color = EXCLUDED.accent_color,
        surface_color = EXCLUDED.surface_color, surface_raised_color = EXCLUDED.surface_raised_color, ink_color = EXCLUDED.ink_color,
        ink_soft_color = EXCLUDED.ink_soft_color, ink_faint_color = EXCLUDED.ink_faint_color, line_color = EXCLUDED.line_color,
        card_radius = EXCLUDED.card_radius, button_radius = EXCLUDED.button_radius,
        updated_by = EXCLUDED.updated_by, updated_at = EXCLUDED.updated_at
    `, [values.preset, values.bodyStyle, values.contentWidth, values.sectionSpacing, values.shopLayout, values.headingFont, values.bodyFont, values.primaryColor, values.accentColor, values.surfaceColor, values.surfaceRaisedColor, values.inkColor, values.inkSoftColor, values.inkFaintColor, values.lineColor, values.cardRadius, values.buttonRadius, actorId, now]);
    await client.query(
      "INSERT INTO audit_events (id, actor_id, event_type, entity_type, entity_id, metadata_json, created_at) VALUES ($1, $2, 'theme_settings.updated', 'theme_settings', 'default', $3, $4)",
      [randomUUID(), actorId, JSON.stringify({ synthetic: true, preset: values.preset }), now],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
  return readThemeSettings(database);
}

const fontStacks: Record<ThemeFont, string> = {
  manrope: "'Manrope', Arial, sans-serif",
  "dm-sans": "'DM Sans', Arial, sans-serif",
  montserrat: "'Montserrat', Arial, sans-serif",
  roboto: "'Roboto', Arial, sans-serif",
  karla: "'Karla', Arial, sans-serif",
  garamond: "Garamond, Georgia, serif",
};

const spacingValues = { none: "0px", small: "16px", medium: "23px", large: "38px" } as const;

export function themeCssVariables(settings: ThemeSettings): CSSProperties {
  return {
    "--content-width": `${settings.contentWidth}px`,
    "--section-gap": spacingValues[settings.sectionSpacing],
    "--heading-font": fontStacks[settings.headingFont],
    "--body-font": fontStacks[settings.bodyFont],
    "--ink": settings.inkColor,
    "--ink-soft": settings.inkSoftColor,
    "--ink-faint": settings.inkFaintColor,
    "--surface": settings.surfaceColor,
    "--surface-raised": settings.surfaceRaisedColor,
    "--surface-tinted": `color-mix(in srgb, ${settings.primaryColor} 8%, ${settings.surfaceColor})`,
    "--line": settings.lineColor,
    "--teal": settings.primaryColor,
    "--teal-dark": `color-mix(in srgb, ${settings.primaryColor} 78%, #000)`,
    "--teal-soft": `color-mix(in srgb, ${settings.primaryColor} 14%, #fff)`,
    "--coral": settings.accentColor,
    "--coral-soft": `color-mix(in srgb, ${settings.accentColor} 14%, #fff)`,
    "--radius": `${settings.cardRadius}px`,
    "--button-radius": `${settings.buttonRadius}px`,
  } as CSSProperties;
}

export function themePresetValues(preset: ThemeSettingsValues["preset"]): ThemeSettingsValues | null {
  return preset === "custom" ? null : THEME_PRESETS[preset];
}
