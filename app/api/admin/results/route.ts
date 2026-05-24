import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE_NAME, isValidAdminSessionToken } from "@/lib/admin-auth";
import { UNIT_LIST } from "@/lib/constants";
import { RESULT_FONT_VALUES } from "@/lib/results-fonts";
import { clearPublishedResults, getAdminResultsSnapshot, publishResult } from "@/lib/results-store";
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

export const runtime = "nodejs";

function isAuthorized(req: NextRequest): boolean {
  const session = req.cookies.get(ADMIN_SESSION_COOKIE_NAME)?.value;
  return isValidAdminSessionToken(session);
}

function normalizeUnit(value: unknown): UnitName {
  return UNIT_LIST.includes(value as UnitName) ? value as UnitName : UNIT_LIST[0];
}

function normalizeEntry(input: Partial<ResultEntry>, position: 1 | 2 | 3): ResultEntry {
  return {
    position,
    name: typeof input.name === "string" ? input.name.trim().slice(0, 120) : "",
    unit: normalizeUnit(input.unit),
    chestNumber: typeof input.chestNumber === "string" ? input.chestNumber.trim().slice(0, 24) : "",
    codeLetter: typeof input.codeLetter === "string" ? input.codeLetter.trim().slice(0, 24) : "",
    points: typeof input.points === "string" ? input.points.trim().slice(0, 24) : "",
  };
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
    const rawEntries = Array.isArray(body.entries) ? body.entries : [];
    const input: PublishResultInput = {
      programId: typeof body.programId === "string" ? body.programId : "",
      templateId: typeof body.templateId === "string" && body.templateId ? body.templateId : undefined,
      layoutOverride: normalizePublishLayoutOverride(body.layoutOverride),
      entries: [1, 2, 3].map((position) =>
        normalizeEntry(
          rawEntries.find((entry) => Number((entry as ResultEntry).position) === position) as Partial<ResultEntry> ?? {},
          position as 1 | 2 | 3,
        ),
      ),
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

export async function DELETE(req: NextRequest) {
  try {
    if (!isAuthorized(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await clearPublishedResults();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to clear published results", error);
    return NextResponse.json({ error: "Failed to clear published results" }, { status: 500 });
  }
}
