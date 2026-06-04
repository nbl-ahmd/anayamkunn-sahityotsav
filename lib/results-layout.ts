import {
  RESULT_FIELD_KEYS,
  RESULT_POSITION_KEYS,
  ResultEntry,
  ResultFieldKey,
  ResultLayoutOverride,
  ResultPositionKey,
  ResultPositionMarker,
  ResultTemplateConfig,
  ResultTemplateFields,
  ResultTemplatePositionMarkers,
  ResultTextBox,
} from "@/lib/results-types";
import { buildTextPositionMarkers, clonePositionMarkers } from "@/lib/results-defaults";

export const positionFieldKeys: Record<ResultPositionKey, ResultFieldKey> = {
  first: "firstPosition",
  second: "secondPosition",
  third: "thirdPosition",
};

export const positionNameFieldKeys: Record<ResultPositionKey, ResultFieldKey> = {
  first: "firstName",
  second: "secondName",
  third: "thirdName",
};

export const positionUnitFieldKeys: Record<ResultPositionKey, ResultFieldKey> = {
  first: "firstUnit",
  second: "secondUnit",
  third: "thirdUnit",
};

export const positionEntryNumbers: Record<ResultPositionKey, 1 | 2 | 3> = {
  first: 1,
  second: 2,
  third: 3,
};

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function safeNumber(value: unknown, fallback: number): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function safeColor(value: unknown, fallback: string): string {
  return typeof value === "string" && /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(value.trim())
    ? value.trim()
    : fallback;
}

function cloneTextBox(box: ResultTextBox): ResultTextBox {
  return { ...box };
}

export function markerDefaultsFromFields(fields: ResultTemplateFields): ResultTemplatePositionMarkers {
  return buildTextPositionMarkers(fields);
}

export function normalizePositionMarker(
  input: unknown,
  fallback: ResultPositionMarker,
  normalizeTextBox: (input: Partial<ResultTextBox> | undefined, fallback: ResultTextBox) => ResultTextBox,
): ResultPositionMarker {
  if (!isObject(input)) {
    return fallback.mode === "shape"
      ? { ...fallback, colors: [...fallback.colors] }
      : fallback.mode === "text"
        ? { ...fallback, box: cloneTextBox(fallback.box) }
        : { ...fallback };
  }

  if (input.mode === "hidden" || input.visible === false) {
    return { mode: "hidden", visible: false };
  }

  if (input.mode === "shape") {
    const shape =
      input.shape === "circle" || input.shape === "roundedSquare" || input.shape === "square"
        ? input.shape
        : "square";
    const direction = input.direction === "vertical" ? "vertical" : "horizontal";
    const fallbackShape = fallback.mode === "shape" ? fallback : null;
    const colors = Array.isArray(input.colors)
      ? input.colors.map((color) => safeColor(color, "#f43f5e")).slice(0, 6)
      : fallbackShape?.colors ?? ["#f43f5e"];

    return {
      mode: "shape",
      visible: true,
      x: clamp(safeNumber(input.x, fallbackShape?.x ?? 0.16), 0, 0.98),
      y: clamp(safeNumber(input.y, fallbackShape?.y ?? 0.47), 0, 0.98),
      width: clamp(safeNumber(input.width, fallbackShape?.width ?? 0.025), 0.005, 1),
      height: clamp(safeNumber(input.height, fallbackShape?.height ?? 0.025), 0.005, 1),
      repeat: clamp(Math.round(safeNumber(input.repeat, fallbackShape?.repeat ?? 1)), 1, 12),
      direction,
      gap: clamp(safeNumber(input.gap, fallbackShape?.gap ?? 0.008), 0, 0.2),
      shape,
      colors: colors.length ? colors : ["#f43f5e"],
      rotation: clamp(safeNumber(input.rotation, fallbackShape?.rotation ?? 0), -180, 180),
      opacity: clamp(safeNumber(input.opacity, fallbackShape?.opacity ?? 1), 0, 1),
    };
  }

  if (input.mode === "image") {
    const fallbackImage = fallback.mode === "image" ? fallback : null;
    const imageUrl = typeof input.imageUrl === "string" ? input.imageUrl.trim() : fallbackImage?.imageUrl ?? "";
    return {
      mode: "image",
      visible: true,
      x: clamp(safeNumber(input.x, fallbackImage?.x ?? 0.16), 0, 0.98),
      y: clamp(safeNumber(input.y, fallbackImage?.y ?? 0.47), 0, 0.98),
      width: clamp(safeNumber(input.width, fallbackImage?.width ?? 0.05), 0.005, 1),
      height: clamp(safeNumber(input.height, fallbackImage?.height ?? 0.05), 0.005, 1),
      imageUrl,
      opacity: clamp(safeNumber(input.opacity, fallbackImage?.opacity ?? 1), 0, 1),
    };
  }

  const fallbackText = fallback.mode === "text" ? fallback : null;
  const fallbackBox =
    fallbackText?.box ??
    ({
      x: 0.16,
      y: 0.47,
      width: 0.08,
      height: 0.08,
      fontSize: 48,
      minFontSize: 24,
      fontFamily: "Noto Sans Malayalam",
      fontWeight: 700,
      color: "#111827",
      lineHeight: 1.12,
      textAlign: "center",
      verticalAlign: "middle",
      textTransform: "none",
    } satisfies ResultTextBox);

  return {
    mode: "text",
    visible: true,
    text: typeof input.text === "string" && input.text.trim() ? input.text.trim().slice(0, 24) : fallbackText?.text ?? "1",
    box: normalizeTextBox(isObject(input.box) ? input.box as Partial<ResultTextBox> : undefined, fallbackBox),
  };
}

export function normalizePositionMarkers(
  input: unknown,
  fallback: ResultTemplatePositionMarkers,
  normalizeTextBox: (input: Partial<ResultTextBox> | undefined, fallback: ResultTextBox) => ResultTextBox,
): ResultTemplatePositionMarkers {
  const source = isObject(input) ? input : {};
  return RESULT_POSITION_KEYS.reduce((markers, key) => ({
    ...markers,
    [key]: normalizePositionMarker(source[key], fallback[key], normalizeTextBox),
  }), {} as ResultTemplatePositionMarkers);
}

export function normalizeLayoutOverride(
  input: unknown,
  fallbackFields: ResultTemplateFields,
  fallbackMarkers: ResultTemplatePositionMarkers,
): ResultLayoutOverride | null {
  if (!isObject(input)) {
    return null;
  }

  const hasNestedFields = isObject(input.fields);
  const fieldSource = (hasNestedFields ? input.fields : input) as Record<string, unknown>;
  const fields = RESULT_FIELD_KEYS.reduce((next, key) => ({
    ...next,
    [key]: {
      ...fallbackFields[key],
      ...(isObject(fieldSource[key]) ? fieldSource[key] : {}),
    },
  }), {} as ResultTemplateFields);

  return {
    fields,
    positionMarkers: isObject(input.positionMarkers)
      ? normalizePositionMarkers(input.positionMarkers, fallbackMarkers, (value, fallback) => ({
          ...fallback,
          ...(value ?? {}),
        }))
      : undefined,
  };
}

export function applyLayoutOverride(template: ResultTemplateConfig, override: ResultLayoutOverride | null): ResultTemplateConfig {
  if (!override) {
    return template;
  }
  return {
    ...template,
    fields: {
      ...template.fields,
      ...override.fields,
    },
    positionMarkers: override.positionMarkers
      ? {
          ...template.positionMarkers,
          ...override.positionMarkers,
        }
      : template.positionMarkers,
  };
}

export function cloneLayoutOverride(input: ResultLayoutOverride): ResultLayoutOverride {
  return {
    fields: RESULT_FIELD_KEYS.reduce((next, key) => ({
      ...next,
      [key]: { ...input.fields[key] },
    }), {} as ResultTemplateFields),
    positionMarkers: input.positionMarkers ? clonePositionMarkers(input.positionMarkers) : undefined,
  };
}

export function getVisiblePlacements(entries: ResultEntry[]): ResultPositionKey[] {
  return RESULT_POSITION_KEYS.filter((key) =>
    entries.some((entry) => entry.position === positionEntryNumbers[key] && entry.name.trim()),
  );
}

export function getVisiblePlacementsFromValues(values: Record<ResultFieldKey, string>): ResultPositionKey[] {
  return RESULT_POSITION_KEYS.filter((key) => Boolean(values[positionNameFieldKeys[key]]?.trim()));
}
