import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE_NAME, isValidAdminSessionToken } from "@/lib/admin-auth";
import { RESULT_PROGRAMS } from "@/lib/result-programs";
import { buildDefaultResultTemplate } from "@/lib/results-defaults";
import { RESULT_FONT_VALUES } from "@/lib/results-fonts";
import { normalizePositionMarkers } from "@/lib/results-layout";
import { saveResultTemplate } from "@/lib/results-store";
import {
  RESULT_FIELD_KEYS,
  ResultTemplateScopeType,
  ResultTextBox,
  SaveResultTemplateInput,
} from "@/lib/results-types";

export const runtime = "nodejs";

function isAuthorized(req: NextRequest): boolean {
  const session = req.cookies.get(ADMIN_SESSION_COOKIE_NAME)?.value;
  return isValidAdminSessionToken(session);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeColor(value: unknown, fallback: string): string {
  if (typeof value !== "string") {
    return fallback;
  }
  const color = value.trim();
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(color) ? color : fallback;
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

function normalizeScopeType(value: unknown): ResultTemplateScopeType {
  return value === "category" || value === "program" || value === "global" ? value : "global";
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

function normalizeScopeValue(scopeType: ResultTemplateScopeType, value: unknown): string | null {
  if (scopeType === "global") {
    return null;
  }
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) {
    return null;
  }
  if (scopeType === "program") {
    return RESULT_PROGRAMS.some((program) => program.id === raw) ? raw : null;
  }
  const categories = new Set<string>();
  RESULT_PROGRAMS.forEach((program) => {
    categories.add(program.category);
    categories.add(program.categoryGroup);
  });
  return categories.has(raw) ? raw : null;
}

export async function POST(req: NextRequest) {
  try {
    if (!isAuthorized(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json() as Partial<SaveResultTemplateInput>;
    const defaults = buildDefaultResultTemplate();
    const scopeType = normalizeScopeType(body.scopeType);
    const scopeValue = normalizeScopeValue(scopeType, body.scopeValue);

    if (scopeType !== "global" && !scopeValue) {
      return NextResponse.json({ error: "A valid scope target is required" }, { status: 400 });
    }

    const input: SaveResultTemplateInput = {
      id: typeof body.id === "string" && body.id ? body.id : undefined,
      name: typeof body.name === "string" && body.name.trim() ? body.name.trim().slice(0, 80) : "Result Template",
      scopeType,
      scopeValue,
      backgroundImage:
        typeof body.backgroundImage === "string" && body.backgroundImage.trim()
          ? body.backgroundImage.trim()
          : null,
      size: {
        width: clamp(Math.round(Number(body.size?.width ?? defaults.size.width)), 720, 2160),
        posterHeight: clamp(Math.round(Number(body.size?.posterHeight ?? defaults.size.posterHeight)), 720, 2160),
        adHeight: clamp(Math.round(Number(body.size?.adHeight ?? defaults.size.adHeight)), 120, 720),
      },
      fields: RESULT_FIELD_KEYS.reduce((fields, key) => ({
        ...fields,
        [key]: normalizeTextBox(body.fields?.[key], defaults.fields[key]),
      }), defaults.fields),
      positionMarkers: normalizePositionMarkers(
        body.positionMarkers,
        defaults.positionMarkers,
        normalizeTextBox,
      ),
      active: body.active ?? true,
    };

    const template = await saveResultTemplate(input);
    return NextResponse.json({ template });
  } catch (error) {
    console.error("Failed to save result template", error);
    return NextResponse.json({ error: "Failed to save result template" }, { status: 500 });
  }
}
