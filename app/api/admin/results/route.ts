import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE_NAME, isValidAdminSessionToken } from "@/lib/admin-auth";
import { DEFAULT_UNIT_LIST } from "@/lib/constants";
import { RESULT_FONT_VALUES } from "@/lib/results-fonts";
import {
  clearPublishedResults,
  deletePublishedResult,
  getAdminResultsSnapshot,
  publishResult,
  updatePublishedResultStatus,
} from "@/lib/results-store";
import {
  normalizeLayoutOverride as normalizeResultLayoutOverride,
  normalizePositionMarkers,
} from "@/lib/results-layout";
import {
  RESULT_FIELD_KEYS,
  PublishResultInput,
  ResultEntry,
  ResultTextBox,
} from "@/lib/results-types";
import { UnitName } from "@/lib/types";
import { buildDefaultResultTemplate } from "@/lib/results-defaults";
import { getAppSettings } from "@/lib/store";

export const runtime = "nodejs";

function isAuthorized(req: NextRequest): boolean {
  const session = req.cookies.get(ADMIN_SESSION_COOKIE_NAME)?.value;
  return isValidAdminSessionToken(session);
}

function normalizeUnit(value: unknown, units: readonly string[]): UnitName {
  return typeof value === "string" && units.includes(value) ? value : units[0] ?? DEFAULT_UNIT_LIST[0];
}

function normalizeEntry(input: Partial<ResultEntry>, position: 1 | 2 | 3, units: readonly string[]): ResultEntry {
  return {
    position,
    name: typeof input.name === "string" ? input.name.trim().slice(0, 120) : "",
    unit: normalizeUnit(input.unit, units),
    chestNumber: typeof input.chestNumber === "string" ? input.chestNumber.trim().slice(0, 24) : "",
    codeLetter: typeof input.codeLetter === "string" ? input.codeLetter.trim().slice(0, 24) : "",
    points: typeof input.points === "string" ? input.points.trim().slice(0, 24) : "",
  };
}

function hasEntryContent(entry: ResultEntry): boolean {
  return Boolean(
    entry.name.trim() ||
    entry.chestNumber.trim() ||
    entry.codeLetter.trim() ||
    entry.points.trim(),
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeColor(value: unknown, fallback: string): string {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
}

function normalizeFontFamily(value: unknown, fallback: string): string {
  if (typeof value !== "string") {
    return fallback;
  }
  const font = value.trim();
  return RESULT_FONT_VALUES.includes(font)
    ? font
    : fallback;
}

function normalizeTextBox(input: Partial<ResultTextBox> | undefined, fallback: ResultTextBox): ResultTextBox {
  const textAlign = input?.textAlign === "left" || input?.textAlign === "right" || input?.textAlign === "center"
    ? input.textAlign
    : fallback.textAlign;
  const verticalAlign = input?.verticalAlign === "top" || input?.verticalAlign === "bottom" || input?.verticalAlign === "middle"
    ? input.verticalAlign
    : fallback.verticalAlign;

  return {
    ...fallback,
    x: clamp(Number(input?.x ?? fallback.x), 0, 0.98),
    y: clamp(Number(input?.y ?? fallback.y), 0, 0.98),
    width: clamp(Number(input?.width ?? fallback.width), 0.02, 1),
    height: clamp(Number(input?.height ?? fallback.height), 0.02, 1),
    fontSize: clamp(Math.round(Number(input?.fontSize ?? fallback.fontSize)), 8, 180),
    minFontSize: clamp(Math.round(Number(input?.minFontSize ?? fallback.minFontSize)), 8, 120),
    fontFamily: normalizeFontFamily(input?.fontFamily, fallback.fontFamily),
    fontWeight: clamp(Math.round(Number(input?.fontWeight ?? fallback.fontWeight)), 300, 900),
    color: normalizeColor(input?.color, fallback.color),
    lineHeight: clamp(Number(input?.lineHeight ?? fallback.lineHeight), 0.9, 1.8),
    textAlign,
    verticalAlign,
    textTransform: input?.textTransform === "uppercase" ? "uppercase" : "none",
  };
}

function normalizePublishLayoutOverride(value: unknown) {
  const defaults = buildDefaultResultTemplate();
  const normalized = normalizeResultLayoutOverride(value, defaults.fields, defaults.positionMarkers);
  if (!normalized) {
    return null;
  }
  return {
    fields: RESULT_FIELD_KEYS.reduce((fields, key) => ({
      ...fields,
      [key]: normalizeTextBox(normalized.fields[key], defaults.fields[key]),
    }), defaults.fields),
    positionMarkers: normalized.positionMarkers
      ? normalizePositionMarkers(normalized.positionMarkers, defaults.positionMarkers, normalizeTextBox)
      : undefined,
  };
}

export async function GET(req: NextRequest) {
  try {
    if (!isAuthorized(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(await getAdminResultsSnapshot());
  } catch (error) {
    console.error("Failed to load results admin snapshot", error);
    return NextResponse.json({ error: "Failed to load results data" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!isAuthorized(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json() as Partial<PublishResultInput>;
    const settings = await getAppSettings();
    const unitNames = settings.unitNames.length ? settings.unitNames : [...DEFAULT_UNIT_LIST];
    const rawEntries = Array.isArray(body.entries) ? body.entries : [];
    const secondEntries = rawEntries.filter((entry) => Number((entry as ResultEntry).position) === 2);
    const primarySecond = normalizeEntry(secondEntries[0] as Partial<ResultEntry> ?? {}, 2, unitNames);
    const secondarySecond = normalizeEntry(secondEntries[1] as Partial<ResultEntry> ?? {}, 2, unitNames);
    const input: PublishResultInput = {
      programId: typeof body.programId === "string" ? body.programId : "",
      templateId: typeof body.templateId === "string" && body.templateId ? body.templateId : undefined,
      layoutOverride: normalizePublishLayoutOverride(body.layoutOverride),
      entries: [
        normalizeEntry(
          rawEntries.find((entry) => Number((entry as ResultEntry).position) === 1) as Partial<ResultEntry> ?? {},
          1,
          unitNames,
        ),
        primarySecond,
        ...(hasEntryContent(secondarySecond) ? [secondarySecond] : []),
        normalizeEntry(
          rawEntries.find((entry) => Number((entry as ResultEntry).position) === 3) as Partial<ResultEntry> ?? {},
          3,
          unitNames,
        ),
      ],
      status: body.status === "submitted" ? "submitted" : "published",
    };

    if (!input.programId) {
      return NextResponse.json({ error: "Program is required" }, { status: 400 });
    }
    if (!input.entries.some((entry) => entry.position === 1 && entry.name)) {
      return NextResponse.json({ error: "First position winner is required" }, { status: 400 });
    }

    const result = await publishResult(input);
    return NextResponse.json({ result });
  } catch (error) {
    console.error("Failed to publish result", error);
    return NextResponse.json({ error: "Failed to publish result" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    if (!isAuthorized(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json() as { ids?: unknown; status?: unknown };
    const ids = Array.isArray(body.ids) ? body.ids.filter((id) => typeof id === "string") as string[] : [];
    const status = body.status === "submitted" ? "submitted" : body.status === "published" ? "published" : null;
    if (!status || !ids.length) {
      return NextResponse.json({ error: "Invalid status update" }, { status: 400 });
    }

    await updatePublishedResultStatus({ ids, status });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to update result status", error);
    return NextResponse.json({ error: "Failed to update result status" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    if (!isAuthorized(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const id = req.nextUrl.searchParams.get("id");
    if (id) {
      await deletePublishedResult(id);
      return NextResponse.json({ ok: true });
    }

    await clearPublishedResults();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to clear published results", error);
    return NextResponse.json({ error: "Failed to clear published results" }, { status: 500 });
  }
}
