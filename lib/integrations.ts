import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from "node:crypto";
import { assertStandaloneDataset, getDb, type DatabaseClient, type DatabaseRow } from "@/lib/db";
import { DomainError } from "@/lib/errors";
import { emailProviderByValue, streamingProviderByValue, type EmailProvider, type StreamingProvider } from "@/lib/integration-catalog";
import type { IntegrationSettingsView } from "@/lib/types";

type IntegrationConfig = Record<string, string>;
type IntegrationRow = DatabaseRow & {
  streaming_provider: StreamingProvider | null;
  email_provider: EmailProvider | null;
  streaming_config_ciphertext: string;
  email_config_ciphertext: string;
  updated_at: string;
};

const secretFields = new Set([
  "apiKey", "apiToken", "webhookSecret", "tokenSecret", "webhookSigningSecret",
  "secretAccessKey", "serverToken",
]);

function encryptionKey(): Buffer {
  const source = process.env.INTEGRATION_ENCRYPTION_KEY ?? process.env.SESSION_SECRET;
  if (!source || source.length < 32) throw new DomainError("Set INTEGRATION_ENCRYPTION_KEY or a 32-character SESSION_SECRET before saving provider credentials.", 503);
  return createHash("sha256").update(source).digest();
}

function encrypt(config: IntegrationConfig): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(config), "utf8"), cipher.final()]);
  return [iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), encrypted.toString("base64url")].join(".");
}

function decrypt(value: string): IntegrationConfig {
  if (!value) return {};
  try {
    const [ivValue, tagValue, encryptedValue] = value.split(".");
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivValue, "base64url"));
    decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
    const decrypted = Buffer.concat([decipher.update(Buffer.from(encryptedValue, "base64url")), decipher.final()]).toString("utf8");
    const parsed: unknown = JSON.parse(decrypted);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).filter(([, item]) => typeof item === "string")) as IntegrationConfig;
  } catch {
    throw new DomainError("Saved provider credentials could not be decrypted. Check the integration encryption key.", 503);
  }
}

function safeValues(config: IntegrationConfig): { values: IntegrationConfig; secrets: string[] } {
  const values: IntegrationConfig = {};
  const secrets: string[] = [];
  for (const [key, value] of Object.entries(config)) {
    if (secretFields.has(key)) {
      if (value) secrets.push(key);
    } else {
      values[key] = value;
    }
  }
  return { values, secrets };
}

function rowView(row: IntegrationRow): IntegrationSettingsView {
  const streaming = safeValues(decrypt(row.streaming_config_ciphertext));
  const email = safeValues(decrypt(row.email_config_ciphertext));
  return {
    streamingProvider: row.streaming_provider,
    emailProvider: row.email_provider,
    streamingValues: streaming.values,
    emailValues: email.values,
    savedStreamingSecrets: streaming.secrets,
    savedEmailSecrets: email.secrets,
    updatedAt: row.updated_at,
  };
}

async function readRow(database: Pick<DatabaseClient, "query">): Promise<IntegrationRow | null> {
  const { rows } = await database.query<IntegrationRow>("SELECT streaming_provider, email_provider, streaming_config_ciphertext, email_config_ciphertext, updated_at FROM integration_settings WHERE id = 'default'");
  return rows[0] ?? null;
}

export async function getIntegrationSettings(): Promise<IntegrationSettingsView> {
  await assertStandaloneDataset();
  const row = await readRow(getDb());
  return row ? rowView(row) : { streamingProvider: null, emailProvider: null, streamingValues: {}, emailValues: {}, savedStreamingSecrets: [], savedEmailSecrets: [], updatedAt: "" };
}

export type IntegrationSettingsInput = {
  streamingProvider: StreamingProvider | null;
  emailProvider: EmailProvider | null;
  streamingValues: IntegrationConfig;
  emailValues: IntegrationConfig;
};

function mergedConfig(next: IntegrationConfig, previous: IntegrationConfig): IntegrationConfig {
  const merged = { ...previous };
  for (const [key, value] of Object.entries(next)) {
    const trimmed = value.trim();
    if (trimmed) merged[key] = trimmed;
  }
  return merged;
}

function validateProviderConfig(provider: StreamingProvider | EmailProvider | null, config: IntegrationConfig, kind: "streaming" | "email"): void {
  if (!provider) return;
  const catalog = kind === "streaming" ? streamingProviderByValue.get(provider as StreamingProvider) : emailProviderByValue.get(provider as EmailProvider);
  if (!catalog) throw new DomainError("Choose a supported provider.");
  for (const field of catalog.fields) {
    if (field.required !== false && !config[field.name]?.trim()) throw new DomainError(`${field.label} is required for ${catalog.label}.`);
  }
  const fromEmail = config.fromEmail?.match(/<([^>]+)>/)?.[1] ?? config.fromEmail;
  if (kind === "email" && fromEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fromEmail)) throw new DomainError("Enter a valid From email address.");
}

export async function updateIntegrationSettings(input: IntegrationSettingsInput, actorId: string): Promise<IntegrationSettingsView> {
  await assertStandaloneDataset();
  const database = getDb();
  const current = await readRow(database);
  const previousStreaming = current ? decrypt(current.streaming_config_ciphertext) : {};
  const previousEmail = current ? decrypt(current.email_config_ciphertext) : {};
  const streamingConfig = input.streamingProvider ? mergedConfig(input.streamingValues, previousStreaming) : {};
  const emailConfig = input.emailProvider ? mergedConfig(input.emailValues, previousEmail) : {};
  validateProviderConfig(input.streamingProvider, streamingConfig, "streaming");
  validateProviderConfig(input.emailProvider, emailConfig, "email");
  const now = new Date().toISOString();
  const client = await database.connect();
  try {
    await client.query("BEGIN");
    await client.query(`
      UPDATE integration_settings
      SET streaming_provider = $1, email_provider = $2, streaming_config_ciphertext = $3,
          email_config_ciphertext = $4, updated_by = $5, updated_at = $6
      WHERE id = 'default'
    `, [input.streamingProvider, input.emailProvider, encrypt(streamingConfig), encrypt(emailConfig), actorId, now]);
    await client.query(
      "INSERT INTO audit_events (id, actor_id, event_type, entity_type, entity_id, metadata_json, created_at) VALUES ($1, $2, 'integrations.updated', 'integration_settings', 'default', $3, $4)",
      [randomUUID(), actorId, JSON.stringify({ streamingProvider: input.streamingProvider, emailProvider: input.emailProvider, secretValuesExcluded: true }), now],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
  const saved = await readRow(database);
  if (!saved) throw new DomainError("The integration settings could not be loaded after saving.", 500);
  return rowView(saved);
}
