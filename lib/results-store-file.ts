import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { RESULT_PROGRAMS, getResultProgram } from "@/lib/result-programs";
import {
  deleteAllLocalGeneratedResultPosters,
  deleteGeneratedResultPosters,
  persistGeneratedResultPoster,
} from "@/lib/results-assets";
import { buildDefaultResultTemplate, DEFAULT_RESULT_TEMPLATE_ID } from "@/lib/results-defaults";
import {
  applyLayoutOverride,
  markerDefaultsFromFields,
  normalizeLayoutOverride,
  normalizePositionMarkers,
} from "@/lib/results-layout";
import { renderResultPoster } from "@/lib/results-renderer";
import {
  PublishResultInput,
  PublishedResult,
  ResultAdConfig,
  ResultEntry,
  ResultLayoutOverride,
  ResultPosterVariant,
  ResultsAdminSnapshot,
  ResultsPublicSnapshot,
  ResultStoreData,
  ResultTemplateConfig,
  ResultTextBox,
  SaveResultAdInput,
  SaveResultTemplateInput,
} from "@/lib/results-types";
import { UNIT_LIST } from "@/lib/constants";
import { UnitName } from "@/lib/types";

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_FILE = path.join(DATA_DIR, "results-store.json");

let mutationQueue: Promise<unknown> = Promise.resolve();

function createInitialStore(): ResultStoreData {
  return {
    nextResultNumber: 1,
    templates: [buildDefaultResultTemplate()],
    ads: [],
    results: [],
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function normalizeTextBox(input: Partial<ResultTextBox> | undefined, fallback: ResultTextBox): ResultTextBox {
  return {
    ...fallback,
    ...(isObject(input) ? input : {}),
  };
}

function normalizeStore(input: Partial<ResultStoreData> | null | undefined): ResultStoreData {
  const fallback = createInitialStore();
  if (!input) {
    return fallback;
  }

  const templates = Array.isArray(input.templates) && input.templates.length
    ? input.templates.map(normalizeTemplate)
    : fallback.templates;
  if (!templates.some((template) => template.id === DEFAULT_RESULT_TEMPLATE_ID)) {
    templates.unshift(fallback.templates[0]);
  }

  return {
    nextResultNumber: Math.max(1, Math.floor(Number(input.nextResultNumber ?? 1)) || 1),
    templates,
    ads: Array.isArray(input.ads) ? input.ads.map(normalizeAd).filter(Boolean) as ResultAdConfig[] : [],
    results: Array.isArray(input.results)
      ? input.results.map(normalizeResult).filter(Boolean) as PublishedResult[]
      : [],
  };
}

async function ensureStoreFile(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(STORE_FILE);
  } catch {
    await fs.writeFile(STORE_FILE, JSON.stringify(createInitialStore(), null, 2), "utf8");
  }
}

async function readStore(): Promise<ResultStoreData> {
  await ensureStoreFile();
  const raw = await fs.readFile(STORE_FILE, "utf8");
  return normalizeStore(JSON.parse(raw) as Partial<ResultStoreData>);
}

async function writeStore(store: ResultStoreData): Promise<void> {
  await fs.writeFile(STORE_FILE, JSON.stringify(store, null, 2), "utf8");
}

async function withStoreMutation<T>(mutator: (store: ResultStoreData) => Promise<T>): Promise<T> {
  const run = mutationQueue.then(async () => {
    const store = await readStore();
    const result = await mutator(store);
    await writeStore(store);
    return result;
  });

  mutationQueue = run.catch(() => undefined);
  return run;
}

function normalizeTemplate(input: unknown): ResultTemplateConfig {
  const defaults = buildDefaultResultTemplate();
  if (!isObject(input)) {
    return defaults;
  }
  const template = input as Partial<ResultTemplateConfig>;
  return {
    ...defaults,
    ...template,
    id: typeof template.id === "string" && template.id ? template.id : randomUUID(),
    name: typeof template.name === "string" && template.name.trim() ? template.name.trim() : defaults.name,
    scopeType:
      template.scopeType === "category" || template.scopeType === "program" || template.scopeType === "global"
        ? template.scopeType
        : "global",
    scopeValue: typeof template.scopeValue === "string" && template.scopeValue.trim() ? template.scopeValue.trim() : null,
    backgroundImage:
      typeof template.backgroundImage === "string" && template.backgroundImage.trim()
        ? template.backgroundImage.trim()
        : null,
    size: {
      width: Math.max(720, Number(template.size?.width ?? defaults.size.width)),
      posterHeight: Math.max(720, Number(template.size?.posterHeight ?? defaults.size.posterHeight)),
      adHeight: Math.max(120, Number(template.size?.adHeight ?? defaults.size.adHeight)),
    },
    resultNumberFormat:
      template.resultNumberFormat === "number" || template.resultNumberFormat === "label"
        ? template.resultNumberFormat
        : defaults.resultNumberFormat,
    fields: {
      ...defaults.fields,
      ...(isObject(template.fields) ? template.fields : {}),
    },
    positionMarkers: normalizePositionMarkers(
      template.positionMarkers,
      markerDefaultsFromFields({
        ...defaults.fields,
        ...(isObject(template.fields) ? template.fields : {}),
      }),
      normalizeTextBox,
    ),
    active: template.active ?? true,
    createdAt: validIso(template.createdAt) ?? new Date().toISOString(),
    updatedAt: validIso(template.updatedAt) ?? new Date().toISOString(),
  };
}

function normalizeStoredLayoutOverride(input: unknown): ResultLayoutOverride | null {
  const defaults = buildDefaultResultTemplate();
  return normalizeLayoutOverride(input, defaults.fields, defaults.positionMarkers);
}

function normalizeAd(input: unknown): ResultAdConfig | null {
  if (!isObject(input)) {
    return null;
  }
  const ad = input as Partial<ResultAdConfig>;
  if (!ad.imageUrl || typeof ad.imageUrl !== "string") {
    return null;
  }
  const now = new Date().toISOString();
  return {
    id: typeof ad.id === "string" && ad.id ? ad.id : randomUUID(),
    name: typeof ad.name === "string" && ad.name.trim() ? ad.name.trim() : "Sponsor Ad",
    imageUrl: ad.imageUrl.trim(),
    rangeStart: Math.max(1, Math.floor(Number(ad.rangeStart ?? 1)) || 1),
    rangeEnd: Math.max(1, Math.floor(Number(ad.rangeEnd ?? ad.rangeStart ?? 1)) || 1),
    scopeType:
      ad.scopeType === "category" || ad.scopeType === "program" || ad.scopeType === "global"
        ? ad.scopeType
        : "global",
    scopeValue: typeof ad.scopeValue === "string" && ad.scopeValue.trim() ? ad.scopeValue.trim() : null,
    active: ad.active ?? true,
    createdAt: validIso(ad.createdAt) ?? now,
    updatedAt: validIso(ad.updatedAt) ?? now,
  };
}

function normalizeResult(input: unknown): PublishedResult | null {
  if (!isObject(input)) {
    return null;
  }
  const result = input as Partial<PublishedResult>;
  if (!result.programId || !result.posterImageUrl || !result.resultNumber) {
    return null;
  }
  const program = getResultProgram(result.programId);
  if (!program) {
    return null;
  }
  const now = new Date().toISOString();
  const posterImageUrl = typeof result.posterImageUrl === "string" ? result.posterImageUrl : "";
  const posterVariants = normalizePosterVariants(result.posterVariants, posterImageUrl, result.templateId);
  if (!posterImageUrl && !posterVariants.length) {
    return null;
  }

  return {
    id: typeof result.id === "string" && result.id ? result.id : randomUUID(),
    programId: program.id,
    competitionName: program.publicCompetitionName,
    category: program.category,
    categoryGroup: program.categoryGroup,
    resultNumber: Math.max(1, Math.floor(Number(result.resultNumber))),
    entries: normalizeEntries(result.entries),
    templateId: typeof result.templateId === "string" && result.templateId ? result.templateId : DEFAULT_RESULT_TEMPLATE_ID,
    layoutOverride: normalizeStoredLayoutOverride(result.layoutOverride),
    adId: typeof result.adId === "string" && result.adId ? result.adId : null,
    posterImageUrl: posterImageUrl || posterVariants[0]?.imageUrl || "",
    posterVariants,
    status: "published",
    publishedAt: validIso(result.publishedAt) ?? now,
    createdAt: validIso(result.createdAt) ?? now,
    updatedAt: validIso(result.updatedAt) ?? now,
  };
}

function normalizePosterVariants(
  input: unknown,
  posterImageUrl: string,
  templateId: unknown,
): ResultPosterVariant[] {
  const list = Array.isArray(input) ? input : [];
  const variants = list.flatMap((item): ResultPosterVariant[] => {
    if (!isObject(item) || typeof item.imageUrl !== "string" || !item.imageUrl.trim()) {
      return [];
    }
    const variantTemplateId = typeof item.templateId === "string" && item.templateId
      ? item.templateId
      : typeof templateId === "string" && templateId
        ? templateId
        : DEFAULT_RESULT_TEMPLATE_ID;
    return [{
      id: typeof item.id === "string" && item.id ? item.id : variantTemplateId,
      templateId: variantTemplateId,
      templateName: typeof item.templateName === "string" && item.templateName.trim()
        ? item.templateName.trim()
        : "Poster Design",
      imageUrl: item.imageUrl.trim(),
      isDefault: Boolean(item.isDefault),
      generatedAt: validIso(item.generatedAt) ?? new Date().toISOString(),
    }];
  });

  if (!variants.length && posterImageUrl) {
    const legacyTemplateId = typeof templateId === "string" && templateId ? templateId : DEFAULT_RESULT_TEMPLATE_ID;
    return [{
      id: legacyTemplateId,
      templateId: legacyTemplateId,
      templateName: "Default Design",
      imageUrl: posterImageUrl,
      isDefault: true,
      generatedAt: new Date().toISOString(),
    }];
  }

  if (variants.some((variant) => variant.isDefault)) {
    return variants;
  }
  return variants.map((variant, index) => ({ ...variant, isDefault: index === 0 }));
}

function validIso(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function normalizeUnit(value: unknown): UnitName {
  return UNIT_LIST.includes(value as UnitName) ? value as UnitName : UNIT_LIST[0];
}

function normalizeEntries(entries: unknown): ResultEntry[] {
  const list = Array.isArray(entries) ? entries : [];
  return [1, 2, 3].flatMap((position) => {
    const entry = list.find((item) => isObject(item) && Number(item.position) === position) as Partial<ResultEntry> | undefined;
    const name = typeof entry?.name === "string" ? entry.name.trim().slice(0, 120) : "";
    if (!name) {
      return [];
    }

    return [{
      position: position as 1 | 2 | 3,
      name,
      unit: normalizeUnit(entry?.unit),
      chestNumber: typeof entry?.chestNumber === "string" ? entry.chestNumber.trim().slice(0, 24) : "",
      codeLetter: typeof entry?.codeLetter === "string" ? entry.codeLetter.trim().slice(0, 24) : "",
      points: typeof entry?.points === "string" ? entry.points.trim().slice(0, 24) : "",
    }];
  });
}

function templateScopeMatches(template: ResultTemplateConfig, programId: string): boolean {
  const program = getResultProgram(programId);
  if (!program || !template.active) {
    return false;
  }
  if (template.scopeType === "global") {
    return true;
  }
  if (template.scopeType === "program") {
    return template.scopeValue === program.id;
  }
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
  const scoped = templates
    .filter((template) => templateScopeMatches(template, programId))
    .sort((left, right) => scopePriority(right, program?.id, program?.category, program?.categoryGroup) - scopePriority(left, program?.id, program?.category, program?.categoryGroup));

  return scoped[0] ?? templates.find((template) => template.id === DEFAULT_RESULT_TEMPLATE_ID) ?? buildDefaultResultTemplate();
}

function resolveTemplates(
  templates: ResultTemplateConfig[],
  programId: string,
  preferredTemplateId?: string,
): ResultTemplateConfig[] {
  const primary = resolveTemplate(templates, programId, preferredTemplateId);
  const program = getResultProgram(programId);
  const matching = templates
    .filter((template) => templateScopeMatches(template, programId))
    .sort((left, right) =>
      scopePriority(right, program?.id, program?.category, program?.categoryGroup)
      - scopePriority(left, program?.id, program?.category, program?.categoryGroup)
    );

  return [primary, ...matching].filter((template, index, list) =>
    list.findIndex((item) => item.id === template.id) === index
  );
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
  const store = await readStore();
  return {
    programs: RESULT_PROGRAMS,
    templates: store.templates,
    ads: store.ads,
    results: [...store.results].sort((left, right) => right.resultNumber - left.resultNumber),
  };
}

export async function getPublicResultsSnapshot(): Promise<ResultsPublicSnapshot> {
  const store = await readStore();
  const results = [...store.results].sort((left, right) => right.resultNumber - left.resultNumber);
  return {
    programs: RESULT_PROGRAMS.filter((program) => results.some((result) => result.programId === program.id)),
    results,
    templates: store.templates.filter((template) => template.active),
  };
}

export async function saveResultTemplate(input: SaveResultTemplateInput): Promise<ResultTemplateConfig> {
  return withStoreMutation(async (store) => {
    const now = new Date().toISOString();
    const existing = input.id ? store.templates.find((template) => template.id === input.id) : undefined;
    const template = normalizeTemplate({
      ...input,
      id: existing?.id ?? input.id ?? randomUUID(),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    });

    store.templates = existing
      ? store.templates.map((item) => (item.id === template.id ? template : item))
      : [...store.templates, template];

    return template;
  });
}

export async function saveResultAd(input: SaveResultAdInput): Promise<ResultAdConfig> {
  return withStoreMutation(async (store) => {
    const now = new Date().toISOString();
    const existing = input.id ? store.ads.find((ad) => ad.id === input.id) : undefined;
    const ad = normalizeAd({
      ...input,
      id: existing?.id ?? input.id ?? randomUUID(),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    });
    if (!ad) {
      throw new Error("Invalid ad");
    }

    store.ads = existing ? store.ads.map((item) => (item.id === ad.id ? ad : item)) : [...store.ads, ad];
    return ad;
  });
}

export async function publishResult(input: PublishResultInput): Promise<PublishedResult> {
  return withStoreMutation(async (store) => {
    const program = getResultProgram(input.programId);
    if (!program) {
      throw new Error("Invalid program");
    }

    const entries = normalizeEntries(input.entries);
    if (!entries.some((entry) => entry.position === 1)) {
      throw new Error("First position winner is required");
    }

    const now = new Date().toISOString();
    const existing = store.results.find((result) => result.programId === program.id);
    const resultNumber = existing?.resultNumber ?? store.nextResultNumber;
    const templates = resolveTemplates(store.templates, program.id, input.templateId);
    const template = templates[0];
    const ad = existing?.adId
      ? store.ads.find((item) => item.id === existing.adId) ?? null
      : resolveAd(store.ads, resultNumber, program.id);

    const result: PublishedResult = {
      id: existing?.id ?? randomUUID(),
      programId: program.id,
      competitionName: program.publicCompetitionName,
      category: program.category,
      categoryGroup: program.categoryGroup,
      resultNumber,
      entries,
      templateId: template.id,
      layoutOverride: normalizeLayoutOverride(
        input.layoutOverride,
        template.fields,
        template.positionMarkers,
      ),
      adId: ad?.id ?? null,
      posterImageUrl: existing?.posterImageUrl ?? "",
      posterVariants: existing?.posterVariants ?? [],
      status: "published",
      publishedAt: existing?.publishedAt ?? now,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    const generatedAt = now;
    result.posterVariants = await Promise.all(templates.map(async (variantTemplate, index) => {
      const poster = await renderResultPoster(result, applyLayoutOverride(variantTemplate, result.layoutOverride), ad);
      return {
        id: variantTemplate.id,
        templateId: variantTemplate.id,
        templateName: variantTemplate.name,
        imageUrl: await persistGeneratedResultPoster({
          resultId: result.id,
          resultNumber,
          variantId: variantTemplate.id,
          buffer: poster,
        }),
        isDefault: index === 0,
        generatedAt,
      };
    }));
    result.posterImageUrl = result.posterVariants[0]?.imageUrl ?? "";
    if (existing) {
      const nextUrls = new Set([
        result.posterImageUrl,
        ...result.posterVariants.map((variant) => variant.imageUrl),
      ]);
      await deleteGeneratedResultPosters([
        existing.posterImageUrl,
        ...existing.posterVariants.map((variant) => variant.imageUrl),
      ].filter((url) => url && !nextUrls.has(url)));
    }

    if (!existing) {
      store.nextResultNumber = Math.max(store.nextResultNumber + 1, resultNumber + 1);
      store.results.unshift(result);
    } else {
      store.results = store.results.map((item) => (item.id === existing.id ? result : item));
    }

    return result;
  });
}

export async function clearPublishedResults(): Promise<void> {
  await withStoreMutation(async (store) => {
    const posterUrls = store.results.flatMap((result) => [
      result.posterImageUrl,
      ...(result.posterVariants ?? []).map((variant) => variant.imageUrl),
    ]);
    await deleteGeneratedResultPosters(posterUrls);
    await deleteAllLocalGeneratedResultPosters();
    store.results = [];
    store.nextResultNumber = 1;
  });
}

export async function renderPublishedResultPoster(input: {
  resultId: string;
  templateId?: string;
}): Promise<{ buffer: Buffer; result: PublishedResult; template: ResultTemplateConfig }> {
  const store = await readStore();
  const result = store.results.find((item) => item.id === input.resultId);
  if (!result) {
    throw new Error("Result not found");
  }

  const template = applyLayoutOverride(
    resolveTemplate(store.templates, result.programId, input.templateId ?? result.templateId),
    result.layoutOverride,
  );
  const ad = result.adId ? store.ads.find((item) => item.id === result.adId) ?? null : null;
  const buffer = await renderResultPoster(result, template, ad);
  return { buffer, result, template };
}
