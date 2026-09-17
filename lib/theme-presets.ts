export type ThemePresetName = "studio" | "honor" | "autumn" | "green";
export type ThemeBodyStyle = "fullwide" | "wide" | "boxed";
export type ThemeSectionSpacing = "none" | "small" | "medium" | "large";
export type ThemeShopLayout = "grid" | "list";
export type ThemeFont = "manrope" | "dm-sans" | "montserrat" | "roboto" | "karla" | "garamond";

export interface ThemeSettingsValues {
  preset: ThemePresetName | "custom";
  bodyStyle: ThemeBodyStyle;
  contentWidth: number;
  sectionSpacing: ThemeSectionSpacing;
  shopLayout: ThemeShopLayout;
  headingFont: ThemeFont;
  bodyFont: ThemeFont;
  primaryColor: string;
  accentColor: string;
  surfaceColor: string;
  surfaceRaisedColor: string;
  inkColor: string;
  inkSoftColor: string;
  inkFaintColor: string;
  lineColor: string;
  cardRadius: number;
  buttonRadius: number;
}

export const THEME_PRESET_OPTIONS: Array<{ value: ThemePresetName; label: string; description: string }> = [
  { value: "studio", label: "Studio", description: "The current calm teal workspace style." },
  { value: "honor", label: "Honor-inspired", description: "A restrained charcoal, ivory, and rust presentation inspired by the supplied theme." },
  { value: "autumn", label: "Autumn", description: "Warm clay and amber accents for a welcoming storefront." },
  { value: "green", label: "Field green", description: "An outdoors-oriented green and brass palette." },
];

export const THEME_PRESETS: Record<ThemePresetName, ThemeSettingsValues> = {
  studio: {
    preset: "studio",
    bodyStyle: "fullwide",
    contentWidth: 1180,
    sectionSpacing: "medium",
    shopLayout: "grid",
    headingFont: "manrope",
    bodyFont: "dm-sans",
    primaryColor: "#0f776e",
    accentColor: "#e56d54",
    surfaceColor: "#f7f8f5",
    surfaceRaisedColor: "#ffffff",
    inkColor: "#17211f",
    inkSoftColor: "#52615e",
    inkFaintColor: "#60706b",
    lineColor: "#dfe7e2",
    cardRadius: 18,
    buttonRadius: 10,
  },
  honor: {
    preset: "honor",
    bodyStyle: "wide",
    contentWidth: 1240,
    sectionSpacing: "large",
    shopLayout: "grid",
    headingFont: "montserrat",
    bodyFont: "montserrat",
    primaryColor: "#263436",
    accentColor: "#bd5b3d",
    surfaceColor: "#f2efe8",
    surfaceRaisedColor: "#fffdf8",
    inkColor: "#1c2526",
    inkSoftColor: "#5a6260",
    inkFaintColor: "#737a76",
    lineColor: "#d8d4cb",
    cardRadius: 8,
    buttonRadius: 4,
  },
  autumn: {
    preset: "autumn",
    bodyStyle: "wide",
    contentWidth: 1180,
    sectionSpacing: "large",
    shopLayout: "grid",
    headingFont: "garamond",
    bodyFont: "karla",
    primaryColor: "#8d4e36",
    accentColor: "#c18437",
    surfaceColor: "#faf4e9",
    surfaceRaisedColor: "#fffdfa",
    inkColor: "#30251e",
    inkSoftColor: "#6d5a4c",
    inkFaintColor: "#8b7869",
    lineColor: "#e3d7c8",
    cardRadius: 14,
    buttonRadius: 8,
  },
  green: {
    preset: "green",
    bodyStyle: "boxed",
    contentWidth: 1160,
    sectionSpacing: "medium",
    shopLayout: "grid",
    headingFont: "roboto",
    bodyFont: "roboto",
    primaryColor: "#35634e",
    accentColor: "#b4843b",
    surfaceColor: "#f1f4ef",
    surfaceRaisedColor: "#ffffff",
    inkColor: "#1f2d25",
    inkSoftColor: "#53645a",
    inkFaintColor: "#738177",
    lineColor: "#d7e1d6",
    cardRadius: 12,
    buttonRadius: 7,
  },
};

export const DEFAULT_THEME_VALUES = THEME_PRESETS.studio;
