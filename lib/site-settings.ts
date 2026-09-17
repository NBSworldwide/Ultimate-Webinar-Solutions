import { cache } from "react";
import { randomUUID } from "node:crypto";
import { assertStandaloneDataset, getDb, type DatabaseClient, type DatabaseRow } from "@/lib/db";
import { DomainError } from "@/lib/errors";
import type { SiteSettings } from "@/lib/types";

export type SiteSettingsInput = Omit<SiteSettings, "id" | "updatedAt" | "updatedBy" | "ageGateEnabled"> & { ageGateEnabled?: boolean };

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  id: "default",
  displayName: "Webinar Studio",
  legalName: "",
  tagline: "A focused workspace for running memorable live webinars.",
  description: "A standalone workspace for planning, publishing, and operating live webinar sessions.",
  logoUrl: "",
  logoAlt: "",
  primaryEmail: "",
  supportEmail: "",
  phone: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  region: "",
  postalCode: "",
  country: "US",
  websiteUrl: "",
  timezone: "America/Chicago",
  currency: "USD",
  supportUrl: "",
  privacyUrl: "",
  termsUrl: "",
  shippingPolicyUrl: "",
  businessHours: "",
  linkedinUrl: "",
  facebookUrl: "",
  instagramUrl: "",
  ageGateEnabled: false,
  updatedBy: null,
  updatedAt: "",
};

type SiteSettingsRow = DatabaseRow & {
  id: string;
  display_name: string;
  legal_name: string;
  tagline: string;
  description: string;
  logo_url: string;
  logo_alt: string;
  primary_email: string;
  support_email: string;
  phone: string;
  address_line1: string;
  address_line2: string;
  city: string;
  region: string;
  postal_code: string;
  country: string;
  website_url: string;
  timezone: string;
  currency: string;
  support_url: string;
  privacy_url: string;
  terms_url: string;
  shipping_policy_url: string;
  business_hours: string;
  linkedin_url: string;
  facebook_url: string;
  instagram_url: string;
  age_gate_enabled: boolean | number;
  updated_by: string | null;
  updated_at: string;
};

function toSiteSettings(row: SiteSettingsRow): SiteSettings {
  return {
    id: row.id,
    displayName: row.display_name,
    legalName: row.legal_name,
    tagline: row.tagline,
    description: row.description,
    logoUrl: row.logo_url,
    logoAlt: row.logo_alt,
    primaryEmail: row.primary_email,
    supportEmail: row.support_email,
    phone: row.phone,
    addressLine1: row.address_line1,
    addressLine2: row.address_line2,
    city: row.city,
    region: row.region,
    postalCode: row.postal_code,
    country: row.country,
    websiteUrl: row.website_url,
    timezone: row.timezone,
    currency: row.currency,
    supportUrl: row.support_url,
    privacyUrl: row.privacy_url,
    termsUrl: row.terms_url,
    shippingPolicyUrl: row.shipping_policy_url,
    businessHours: row.business_hours,
    linkedinUrl: row.linkedin_url,
    facebookUrl: row.facebook_url,
    instagramUrl: row.instagram_url,
    ageGateEnabled: Boolean(row.age_gate_enabled),
    updatedBy: row.updated_by,
    updatedAt: row.updated_at,
  };
}

const settingsFields = `id, display_name, legal_name, tagline, description, logo_url, logo_alt,
  primary_email, support_email, phone, address_line1, address_line2, city, region, postal_code,
  country, website_url, timezone, currency, support_url, privacy_url, terms_url,
  shipping_policy_url, business_hours, linkedin_url, facebook_url, instagram_url, age_gate_enabled, updated_by, updated_at`;

/**
 * Site identity is a singleton workspace setting. React cache deduplicates the
 * header, footer, metadata, and entity-graph reads during one server render.
 */
export async function readSiteSettings(database: Pick<DatabaseClient, "query">): Promise<SiteSettings> {
  const { rows } = await database.query<SiteSettingsRow>(`SELECT ${settingsFields} FROM site_settings WHERE id = 'default'`);
  return rows[0] ? toSiteSettings(rows[0]) : DEFAULT_SITE_SETTINGS;
}

export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
  await assertStandaloneDataset();
  return readSiteSettings(getDb());
});

function normalized(value: string | undefined): string {
  return value?.trim() ?? "";
}

function isValidTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

export async function updateSiteSettings(input: SiteSettingsInput, actorId: string): Promise<SiteSettings> {
  await assertStandaloneDataset();
  if (input.displayName.trim().length < 2) throw new DomainError("A display name is required.");
  if (!/^[A-Za-z]{2}$/.test(input.country.trim())) throw new DomainError("Country must be a two-letter code.");
  if (!/^[A-Za-z]{3}$/.test(input.currency.trim())) throw new DomainError("Currency must be a three-letter code.");
  if (!isValidTimeZone(input.timezone.trim())) throw new DomainError("Choose a valid IANA time zone.");

  const now = new Date().toISOString();
  const values = [
    normalized(input.displayName), normalized(input.legalName), normalized(input.tagline), normalized(input.description),
    normalized(input.logoUrl), normalized(input.logoAlt), normalized(input.primaryEmail).toLowerCase(), normalized(input.supportEmail).toLowerCase(), normalized(input.phone),
    normalized(input.addressLine1), normalized(input.addressLine2), normalized(input.city), normalized(input.region), normalized(input.postalCode), normalized(input.country).toUpperCase(),
    normalized(input.websiteUrl), normalized(input.timezone), normalized(input.currency).toUpperCase(), normalized(input.supportUrl), normalized(input.privacyUrl), normalized(input.termsUrl),
    normalized(input.shippingPolicyUrl), normalized(input.businessHours), normalized(input.linkedinUrl), normalized(input.facebookUrl), normalized(input.instagramUrl), input.ageGateEnabled ?? false,
  ];
  const database = getDb();
  const client = await database.connect();
  try {
    await client.query("BEGIN");
    await client.query(`
      UPDATE site_settings SET
        display_name = $1, legal_name = $2, tagline = $3, description = $4, logo_url = $5, logo_alt = $6,
        primary_email = $7, support_email = $8, phone = $9, address_line1 = $10, address_line2 = $11,
        city = $12, region = $13, postal_code = $14, country = $15, website_url = $16, timezone = $17,
        currency = $18, support_url = $19, privacy_url = $20, terms_url = $21, shipping_policy_url = $22,
        business_hours = $23, linkedin_url = $24, facebook_url = $25, instagram_url = $26,
        age_gate_enabled = $27, updated_by = $28, updated_at = $29
      WHERE id = 'default'
    `, [...values, actorId, now]);
    await client.query(
      "INSERT INTO audit_events (id, actor_id, event_type, entity_type, entity_id, metadata_json, created_at) VALUES ($1, $2, 'site_settings.updated', 'site_settings', 'default', $3, $4)",
      [randomUUID(), actorId, JSON.stringify({ synthetic: true, fieldsUpdated: values.length }), now],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
  return readSiteSettings(getDb());
}

export function siteAddressLines(settings: SiteSettings): string[] {
  const address = [
    settings.addressLine1,
    settings.addressLine2,
    [settings.city, settings.region, settings.postalCode].filter(Boolean).join(", ").replace(", ,", ","),
  ].filter(Boolean);
  return address.length > 0 ? [...address, settings.country].filter(Boolean) : [];
}

export function siteContactEmail(settings: SiteSettings): string {
  return settings.supportEmail || settings.primaryEmail;
}

export function absoluteSiteAssetUrl(value: string, baseUrl: string): string | undefined {
  if (!value) return undefined;
  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return undefined;
  }
}
