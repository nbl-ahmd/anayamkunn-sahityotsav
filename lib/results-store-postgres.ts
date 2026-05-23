import { randomUUID } from "node:crypto";
import { getSql } from "@/lib/db";
import { UNIT_LIST } from "@/lib/constants";
import { UnitName } from "@/lib/types";
import { RESULT_PROGRAMS, getResultProgram } from "@/lib/result-programs";
import { persistGeneratedResultPoster } from "@/lib/results-assets";
import { buildDefaultResultTemplate, DEFAULT_RESULT_TEMPLATE_ID } from "@/lib/results-defaults";
import { renderResultPoster } from "@/lib/results-renderer";
import {
  PublishResultInput,
  PublishedResult,
  ResultAdConfig,
  ResultEntry,
  ResultsAdminSnapshot,
  ResultsPublicSnapshot,
  ResultTemplateConfig,
  SaveResultAdInput,
  SaveResultTemplateInput,
} from "@/lib/results-types";

type TemplateRow = {
  id: string;
  name: string;
  scope_type: string;
  scope_value: string | null;
  background_image: string | null;
  size: unknown;
  fields: unknown;
  result_number_format?: string | null;
  active: boolean;
  created_at: string | Date;
  updated_at: string | Date;
};

type AdRow = {
  id: string;
  name: string;
  image_url: string;
  range_start: number;
  range_end: number;
  scope_type: string;
  scope_value: string | null;
  active: boolean;
  created_at: string | Date;
  updated_at: string | Date;
};

type ResultRow = {
  id: string;
  program_id: string;
  competition_name: string;
  category: string;
  category_group: string;
  result_number: number;
  entries: unknown;
  template_id: string;
  ad_id: string | null;
  poster_image_url: string;
  status: string;
  published_at: string | Date;
  created_at: string | Date;
  updated_at: string | Date;
};

let schemaReady: Promise<void> | null = null;

function toIso(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function parseJson<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) {
    return fallback;
  }
  try {
    return typeof value === "string" ? JSON.parse(value) as T : value as T;
  } catch {
    return fallback;
  }
}

function normalizeUnit(value: unknown): UnitName {
  return UNIT_LIST.includes(value as UnitName) ? value as UnitName : UNIT_LIST[0];
}

async function ensureSchema(): Promise<void> {
  if (schemaReady) {
    return schemaReady;
  }

  schemaReady = (async () => {
    const sql = getSql();
    const defaultTemplate = buildDefaultResultTemplate();

    await sql`
      CREATE TABLE IF NOT EXISTS result_templates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        scope_type TEXT NOT NULL,
        scope_value TEXT,
        background_image TEXT,
        size JSONB NOT NULL,
        fields JSONB NOT NULL,
        result_number_format TEXT,
        active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL
      );
    `;

    await sql`
      ALTER TABLE result_templates
      ADD COLUMN IF NOT EXISTS result_number_format TEXT;
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS result_ads (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        image_url TEXT NOT NULL,
        range_start INTEGER NOT NULL,
        range_end INTEGER NOT NULL,
        scope_type TEXT NOT NULL,
        scope_value TEXT,
        active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS result_counters (
        id SMALLINT PRIMARY KEY,
        next_result_number INTEGER NOT NULL DEFAULT 1
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS published_results (
        id UUID PRIMARY KEY,
        program_id TEXT NOT NULL UNIQUE,
        competition_name TEXT NOT NULL,
        category TEXT NOT NULL,
        category_group TEXT NOT NULL,
        result_number INTEGER NOT NULL UNIQUE,
        entries JSONB NOT NULL,
        template_id TEXT NOT NULL REFERENCES result_templates(id),
        ad_id TEXT REFERENCES result_ads(id),
        poster_image_url TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'published',
        published_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL
      );
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_published_results_number
      ON published_results(result_number DESC);
    `;

    await sql`
      INSERT INTO result_counters (id, next_result_number)
      VALUES (1, 1)
      ON CONFLICT (id) DO NOTHING;
    `;

    await sql`
      INSERT INTO result_templates (
        id,
        name,
        scope_type,
        scope_value,
        background_image,
        size,
        fields,
        result_number_format,
        active,
        created_at,
        updated_at
      ) VALUES (
        ${defaultTemplate.id},
        ${defaultTemplate.name},
        ${defaultTemplate.scopeType},
        ${defaultTemplate.scopeValue},
        ${defaultTemplate.backgroundImage},
        ${JSON.stringify(defaultTemplate.size)}::jsonb,
        ${JSON.stringify(defaultTemplate.fields)}::jsonb,
        ${defaultTemplate.resultNumberFormat},
        ${defaultTemplate.active},
        ${defaultTemplate.createdAt},
        ${defaultTemplate.updatedAt}
      )
      ON CONFLICT (id) DO NOTHING;
    `;
  })();

  return schemaReady;
}

function normalizeEntries(entries: unknown): ResultEntry[] {
  const list = Array.isArray(entries) ? entries : [];
  return [1, 2, 3].map((position) => {
    const entry = list.find((item) => item && typeof item === "object" && Number((item as ResultEntry).position) === position) as Partial<ResultEntry> | undefined;
    return {
      position: position as 1 | 2 | 3,
      name: typeof entry?.name === "string" ? entry.name.trim().slice(0, 120) : "",
      unit: normalizeUnit(entry?.unit),
      chestNumber: typeof entry?.chestNumber === "string" ? entry.chestNumber.trim().slice(0, 24) : "",
      codeLetter: typeof entry?.codeLetter === "string" ? entry.codeLetter.trim().slice(0, 24) : "",
      points: typeof entry?.points === "string" ? entry.points.trim().slice(0, 24) : "",
    };
  });
}

function rowToTemplate(row: TemplateRow): ResultTemplateConfig {
  const defaults = buildDefaultResultTemplate();
  return {
    id: row.id,
    name: row.name,
    scopeType:
      row.scope_type === "category" || row.scope_type === "program" || row.scope_type === "global"
        ? row.scope_type
        : "global",
    scopeValue: row.scope_value,
    backgroundImage: row.background_image,
    size: {
      ...defaults.size,
      ...parseJson(row.size, defaults.size),
    },
    fields: {
      ...defaults.fields,
      ...parseJson(row.fields, defaults.fields),
    },
    resultNumberFormat:
      row.result_number_format === "number" || row.result_number_format === "label"
        ? row.result_number_format
        : defaults.resultNumberFormat,
    active: Boolean(row.active),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

function rowToAd(row: AdRow): ResultAdConfig {
  return {
    id: row.id,
    name: row.name,
    imageUrl: row.image_url,
    rangeStart: Number(row.range_start),
    rangeEnd: Number(row.range_end),
    scopeType:
      row.scope_type === "category" || row.scope_type === "program" || row.scope_type === "global"
        ? row.scope_type
        : "global",
    scopeValue: row.scope_value,
    active: Boolean(row.active),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

function rowToResult(row: ResultRow): PublishedResult | null {
  const program = getResultProgram(row.program_id);
  if (!program) {
    return null;
  }
  return {
    id: row.id,
    programId: program.id,
    competitionName: row.competition_name,
    category: row.category,
    categoryGroup: program.categoryGroup,
    resultNumber: Number(row.result_number),
    entries: normalizeEntries(row.entries),
    templateId: row.template_id,
    adId: row.ad_id,
    posterImageUrl: row.poster_image_url,
    status: "published",
    publishedAt: toIso(row.published_at),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

async function getTemplates(): Promise<ResultTemplateConfig[]> {
  const sql = getSql();
  const rows = (await sql`
    SELECT *
    FROM result_templates
    ORDER BY created_at ASC
  `) as TemplateRow[];

  return rows.map(rowToTemplate);
}

async function getAds(): Promise<ResultAdConfig[]> {
  const sql = getSql();
  const rows = (await sql`
    SELECT *
    FROM result_ads
    ORDER BY created_at DESC
  `) as AdRow[];

  return rows.map(rowToAd);
}

async function getResults(): Promise<PublishedResult[]> {
  const sql = getSql();
  const rows = (await sql`
    SELECT *
    FROM published_results
    ORDER BY result_number DESC
  `) as ResultRow[];

  return rows.map(rowToResult).filter((result): result is PublishedResult => Boolean(result));
}

function scopePriority(
  item: { scopeType: string; scopeValue: string | null },
  programId?: string,
  category?: string,
  categoryGroup?: string,
): number {
  if (item.scopeType === "program" && item.scopeValue === programId) return 4;
  if (item.scopeType === "category" && item.scopeValue === category) return 3;
  if (item.scopeType === "category" && item.scopeValue === categoryGroup) return 2;
  if (item.scopeType === "global") return 1;
  return 0;
}

function templateScopeMatches(template: ResultTemplateConfig, programId: string): boolean {
  const program = getResultProgram(programId);
  if (!program || !template.active) {
    return false;
  }
  if (template.scopeType === "global") return true;
  if (template.scopeType === "program") return template.scopeValue === program.id;
  return template.scopeValue === program.category || template.scopeValue === program.categoryGroup;
}

function resolveTemplate(
  templates: ResultTemplateConfig[],
  programId: string,
  preferredTemplateId?: string,
): ResultTemplateConfig {
  const preferred = preferredTemplateId
    ? templates.find((template) => template.id === preferredTemplateId && templateScopeMatches(template, programId))
    : undefined;
  if (preferred) {
    return preferred;
  }
  const program = getResultProgram(programId);
  const matching = templates
    .filter((template) => templateScopeMatches(template, programId))
    .sort((left, right) => scopePriority(right, program?.id, program?.category, program?.categoryGroup) - scopePriority(left, program?.id, program?.category, program?.categoryGroup));
  return matching[0] ?? templates.find((template) => template.id === DEFAULT_RESULT_TEMPLATE_ID) ?? buildDefaultResultTemplate();
}

function resolveAd(ads: ResultAdConfig[], resultNumber: number, programId: string): ResultAdConfig | null {
  const program = getResultProgram(programId);
  if (!program) {
    return null;
  }
  return (
    ads
      .filter((ad) => ad.active && ad.rangeStart <= resultNumber && ad.rangeEnd >= resultNumber)
      .filter((ad) => {
        if (ad.scopeType === "global") return true;
        if (ad.scopeType === "program") return ad.scopeValue === program.id;
        return ad.scopeValue === program.category || ad.scopeValue === program.categoryGroup;
      })
      .sort((left, right) => scopePriority(right, program.id, program.category, program.categoryGroup) - scopePriority(left, program.id, program.category, program.categoryGroup))[0] ?? null
  );
}

export async function getAdminResultsSnapshot(): Promise<ResultsAdminSnapshot> {
  await ensureSchema();
  const [templates, ads, results] = await Promise.all([getTemplates(), getAds(), getResults()]);
  return {
    programs: RESULT_PROGRAMS,
    templates,
    ads,
    results,
  };
}

export async function getPublicResultsSnapshot(): Promise<ResultsPublicSnapshot> {
  await ensureSchema();
  const [templates, results] = await Promise.all([getTemplates(), getResults()]);
  return {
    programs: RESULT_PROGRAMS.filter((program) => results.some((result) => result.programId === program.id)),
    results,
    templates: templates.filter((template) => template.active),
  };
}

export async function saveResultTemplate(input: SaveResultTemplateInput): Promise<ResultTemplateConfig> {
  await ensureSchema();
  const sql = getSql();
  const now = new Date().toISOString();
  const existingRows = input.id
    ? (await sql`SELECT created_at FROM result_templates WHERE id = ${input.id} LIMIT 1`) as Array<{ created_at: string | Date }>
    : [];
  const createdAt = existingRows[0] ? toIso(existingRows[0].created_at) : now;
  const template: ResultTemplateConfig = {
    ...buildDefaultResultTemplate(),
    ...input,
    id: input.id || randomUUID(),
    name: input.name.trim() || "Result Template",
    scopeValue: input.scopeType === "global" ? null : input.scopeValue,
    createdAt,
    updatedAt: now,
  };

  await sql`
    INSERT INTO result_templates (
      id,
      name,
      scope_type,
      scope_value,
      background_image,
      size,
      fields,
      result_number_format,
      active,
      created_at,
      updated_at
    ) VALUES (
      ${template.id},
      ${template.name},
      ${template.scopeType},
      ${template.scopeValue},
      ${template.backgroundImage},
      ${JSON.stringify(template.size)}::jsonb,
      ${JSON.stringify(template.fields)}::jsonb,
      ${template.resultNumberFormat},
      ${template.active},
      ${template.createdAt},
      ${template.updatedAt}
    )
    ON CONFLICT (id) DO UPDATE
    SET
      name = EXCLUDED.name,
      scope_type = EXCLUDED.scope_type,
      scope_value = EXCLUDED.scope_value,
      background_image = EXCLUDED.background_image,
      size = EXCLUDED.size,
      fields = EXCLUDED.fields,
      result_number_format = EXCLUDED.result_number_format,
      active = EXCLUDED.active,
      updated_at = EXCLUDED.updated_at
  `;

  return template;
}

export async function saveResultAd(input: SaveResultAdInput): Promise<ResultAdConfig> {
  await ensureSchema();
  const sql = getSql();
  const now = new Date().toISOString();
  const existingRows = input.id
    ? (await sql`SELECT created_at FROM result_ads WHERE id = ${input.id} LIMIT 1`) as Array<{ created_at: string | Date }>
    : [];
  const ad: ResultAdConfig = {
    id: input.id || randomUUID(),
    name: input.name.trim() || "Sponsor Ad",
    imageUrl: input.imageUrl,
    rangeStart: Math.max(1, Math.floor(Number(input.rangeStart))),
    rangeEnd: Math.max(1, Math.floor(Number(input.rangeEnd))),
    scopeType: input.scopeType,
    scopeValue: input.scopeType === "global" ? null : input.scopeValue,
    active: input.active,
    createdAt: existingRows[0] ? toIso(existingRows[0].created_at) : now,
    updatedAt: now,
  };

  await sql`
    INSERT INTO result_ads (
      id,
      name,
      image_url,
      range_start,
      range_end,
      scope_type,
      scope_value,
      active,
      created_at,
      updated_at
    ) VALUES (
      ${ad.id},
      ${ad.name},
      ${ad.imageUrl},
      ${ad.rangeStart},
      ${ad.rangeEnd},
      ${ad.scopeType},
      ${ad.scopeValue},
      ${ad.active},
      ${ad.createdAt},
      ${ad.updatedAt}
    )
    ON CONFLICT (id) DO UPDATE
    SET
      name = EXCLUDED.name,
      image_url = EXCLUDED.image_url,
      range_start = EXCLUDED.range_start,
      range_end = EXCLUDED.range_end,
      scope_type = EXCLUDED.scope_type,
      scope_value = EXCLUDED.scope_value,
      active = EXCLUDED.active,
      updated_at = EXCLUDED.updated_at
  `;

  return ad;
}

export async function publishResult(input: PublishResultInput): Promise<PublishedResult> {
  await ensureSchema();
  const sql = getSql();
  const program = getResultProgram(input.programId);
  if (!program) {
    throw new Error("Invalid program");
  }

  const entries = normalizeEntries(input.entries);
  if (entries.some((entry) => !entry.name.trim())) {
    throw new Error("Winner names are required for all three positions");
  }

  const existingRows = (await sql`
    SELECT *
    FROM published_results
    WHERE program_id = ${program.id}
    LIMIT 1
  `) as ResultRow[];
  const existing = existingRows[0] ? rowToResult(existingRows[0]) : null;

  const resultNumber = existing?.resultNumber ?? Number(
    ((await sql`
      UPDATE result_counters
      SET next_result_number = next_result_number + 1
      WHERE id = 1
      RETURNING next_result_number - 1 AS result_number
    `) as Array<{ result_number: number }>)[0]?.result_number ?? 1,
  );

  const [templates, ads] = await Promise.all([getTemplates(), getAds()]);
  const template = resolveTemplate(templates, program.id, input.templateId);
  const ad = existing?.adId ? ads.find((item) => item.id === existing.adId) ?? null : resolveAd(ads, resultNumber, program.id);
  const now = new Date().toISOString();
  const result: PublishedResult = {
    id: existing?.id ?? randomUUID(),
    programId: program.id,
    competitionName: program.competitionName,
    category: program.category,
    categoryGroup: program.categoryGroup,
    resultNumber,
    entries,
    templateId: template.id,
    adId: ad?.id ?? null,
    posterImageUrl: existing?.posterImageUrl ?? "",
    status: "published",
    publishedAt: existing?.publishedAt ?? now,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  const poster = await renderResultPoster(result, template, ad);
  result.posterImageUrl = await persistGeneratedResultPoster({
    resultId: result.id,
    resultNumber,
    buffer: poster,
  });

  await sql`
    INSERT INTO published_results (
      id,
      program_id,
      competition_name,
      category,
      category_group,
      result_number,
      entries,
      template_id,
      ad_id,
      poster_image_url,
      status,
      published_at,
      created_at,
      updated_at
    ) VALUES (
      ${result.id},
      ${result.programId},
      ${result.competitionName},
      ${result.category},
      ${result.categoryGroup},
      ${result.resultNumber},
      ${JSON.stringify(result.entries)}::jsonb,
      ${result.templateId},
      ${result.adId},
      ${result.posterImageUrl},
      ${result.status},
      ${result.publishedAt},
      ${result.createdAt},
      ${result.updatedAt}
    )
    ON CONFLICT (program_id) DO UPDATE
    SET
      competition_name = EXCLUDED.competition_name,
      category = EXCLUDED.category,
      category_group = EXCLUDED.category_group,
      entries = EXCLUDED.entries,
      template_id = EXCLUDED.template_id,
      ad_id = EXCLUDED.ad_id,
      poster_image_url = EXCLUDED.poster_image_url,
      status = EXCLUDED.status,
      updated_at = EXCLUDED.updated_at
  `;

  return result;
}

export async function renderPublishedResultPoster(input: {
  resultId: string;
  templateId?: string;
}): Promise<{ buffer: Buffer; result: PublishedResult; template: ResultTemplateConfig }> {
  await ensureSchema();
  const sql = getSql();
  const rows = (await sql`
    SELECT *
    FROM published_results
    WHERE id = ${input.resultId}
    LIMIT 1
  `) as ResultRow[];
  const result = rows[0] ? rowToResult(rows[0]) : null;
  if (!result) {
    throw new Error("Result not found");
  }

  const [templates, ads] = await Promise.all([getTemplates(), getAds()]);
  const template = resolveTemplate(templates, result.programId, input.templateId ?? result.templateId);
  const ad = result.adId ? ads.find((item) => item.id === result.adId) ?? null : null;
  const buffer = await renderResultPoster(result, template, ad);
  return { buffer, result, template };
}
