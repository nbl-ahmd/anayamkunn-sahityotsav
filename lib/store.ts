import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { DEFAULT_UNIT_LIST } from "@/lib/constants";
import { getSql, hasDatabaseUrl } from "@/lib/db";
import { AppSettings } from "@/lib/types";

const DATA_DIR = path.join(process.cwd(), "data");
const SETTINGS_FILE = path.join(DATA_DIR, "app-settings.json");

function defaultAppSettings(): AppSettings {
  return {
    sahithyolsavDate: null,
    unitNames: [...DEFAULT_UNIT_LIST],
  };
}

function normalizeUnitNames(input: unknown): string[] {
  if (!Array.isArray(input)) {
    return [...DEFAULT_UNIT_LIST];
  }

  const seen = new Set<string>();
  const units = input
    .map((value) => (typeof value === "string" ? value.trim().replace(/\s+/g, " ") : ""))
    .filter((value) => {
      if (!value || seen.has(value.toLowerCase())) {
        return false;
      }
      seen.add(value.toLowerCase());
      return true;
    })
    .slice(0, 100);

  return units.length ? units : [...DEFAULT_UNIT_LIST];
}

function normalizeAppSettings(input: unknown): AppSettings {
  if (!input || typeof input !== "object") {
    return defaultAppSettings();
  }
  const settings = input as Partial<AppSettings>;
  if (!settings.sahithyolsavDate) {
    return {
      sahithyolsavDate: null,
      unitNames: normalizeUnitNames(settings.unitNames),
    };
  }
  const parsed = new Date(settings.sahithyolsavDate);
  if (Number.isNaN(parsed.getTime())) {
    return {
      sahithyolsavDate: null,
      unitNames: normalizeUnitNames(settings.unitNames),
    };
  }
  return {
    sahithyolsavDate: parsed.toISOString(),
    unitNames: normalizeUnitNames(settings.unitNames),
  };
}

async function ensureSettingsTable() {
  const sql = getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS app_settings (
      id SMALLINT PRIMARY KEY,
      settings JSONB NOT NULL
    )
  `;
  await sql`
    INSERT INTO app_settings (id, settings)
    VALUES (1, ${JSON.stringify(defaultAppSettings())}::jsonb)
    ON CONFLICT (id) DO NOTHING
  `;
}

async function getPostgresAppSettings(): Promise<AppSettings> {
  await ensureSettingsTable();
  const sql = getSql();
  const rows = await sql`SELECT settings FROM app_settings WHERE id = 1` as Array<{ settings: unknown }>;
  return normalizeAppSettings(rows[0]?.settings);
}

async function setPostgresAppSettings(input: AppSettings): Promise<AppSettings> {
  await ensureSettingsTable();
  const sql = getSql();
  const normalized = normalizeAppSettings(input);
  await sql`
    INSERT INTO app_settings (id, settings)
    VALUES (1, ${JSON.stringify(normalized)}::jsonb)
    ON CONFLICT (id) DO UPDATE SET settings = EXCLUDED.settings
  `;
  return normalized;
}

async function getFileAppSettings(): Promise<AppSettings> {
  try {
    const raw = await readFile(SETTINGS_FILE, "utf8");
    return normalizeAppSettings(JSON.parse(raw));
  } catch {
    return defaultAppSettings();
  }
}

async function setFileAppSettings(input: AppSettings): Promise<AppSettings> {
  const normalized = normalizeAppSettings(input);
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(SETTINGS_FILE, JSON.stringify(normalized, null, 2));
  return normalized;
}

export async function getAppSettings(): Promise<AppSettings> {
  return hasDatabaseUrl() ? getPostgresAppSettings() : getFileAppSettings();
}

export async function setAppSettings(input: AppSettings): Promise<AppSettings> {
  return hasDatabaseUrl() ? setPostgresAppSettings(input) : setFileAppSettings(input);
}
