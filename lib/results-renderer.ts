import { promises as fs } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import TextToSVG from "text-to-svg";
import { getPublicCompetitionName } from "@/lib/result-programs";
import { markerDefaultsFromFields } from "@/lib/results-layout";
import {
  RESULT_FIELD_KEYS,
  RESULT_POSITION_KEYS,
  ResultAdConfig,
  ResultFieldKey,
  ResultPositionMarker,
  PublishedResult,
  ResultTemplateConfig,
  ResultTextBox,
} from "@/lib/results-types";

const COOPER_FONT_PATH = path.join(process.cwd(), "public/fonts/Cooper Black Regular.ttf");
const SUPPORTED_FONT_WEIGHTS = [300, 400, 500, 600, 700, 800, 900] as const;

const NOTO_SANS_FONT_PATHS = {
  300: path.join(process.cwd(), "public/fonts/NotoSans-300.ttf"),
  400: path.join(process.cwd(), "public/fonts/NotoSans-400.ttf"),
  500: path.join(process.cwd(), "public/fonts/NotoSans-500.ttf"),
  600: path.join(process.cwd(), "public/fonts/NotoSans-600.ttf"),
  700: path.join(process.cwd(), "public/fonts/NotoSans-700.ttf"),
  800: path.join(process.cwd(), "public/fonts/NotoSans-800.ttf"),
  900: path.join(process.cwd(), "public/fonts/NotoSans-900.ttf"),
};
const MALAYALAM_FONT_PATHS = {
  300: path.join(process.cwd(), "public/fonts/NotoSansMalayalam-300.ttf"),
  400: path.join(process.cwd(), "public/fonts/NotoSansMalayalam-400.ttf"),
  500: path.join(process.cwd(), "public/fonts/NotoSansMalayalam-500.ttf"),
  600: path.join(process.cwd(), "public/fonts/NotoSansMalayalam-600.ttf"),
  700: path.join(process.cwd(), "public/fonts/NotoSansMalayalam-700.ttf"),
  800: path.join(process.cwd(), "public/fonts/NotoSansMalayalam-800.ttf"),
  900: path.join(process.cwd(), "public/fonts/NotoSansMalayalam-900.ttf"),
};
const POPPINS_FONT_PATHS = {
  300: path.join(process.cwd(), "public/fonts/Poppins-Light.ttf"),
  400: path.join(process.cwd(), "public/fonts/Poppins-Regular.ttf"),
  500: path.join(process.cwd(), "public/fonts/Poppins-Medium.ttf"),
  600: path.join(process.cwd(), "public/fonts/Poppins-SemiBold.ttf"),
  700: path.join(process.cwd(), "public/fonts/Poppins-Bold.ttf"),
  800: path.join(process.cwd(), "public/fonts/Poppins-ExtraBold.ttf"),
  900: path.join(process.cwd(), "public/fonts/Poppins-Black.ttf"),
};
const MONTSERRAT_FONT_PATHS = {
  300: path.join(process.cwd(), "public/fonts/Montserrat-300.ttf"),
  400: path.join(process.cwd(), "public/fonts/Montserrat-400.ttf"),
  500: path.join(process.cwd(), "public/fonts/Montserrat-500.ttf"),
  600: path.join(process.cwd(), "public/fonts/Montserrat-600.ttf"),
  700: path.join(process.cwd(), "public/fonts/Montserrat-700.ttf"),
  800: path.join(process.cwd(), "public/fonts/Montserrat-800.ttf"),
  900: path.join(process.cwd(), "public/fonts/Montserrat-900.ttf"),
};
const INTER_FONT_PATHS = {
  300: path.join(process.cwd(), "public/fonts/Inter-300.ttf"),
  400: path.join(process.cwd(), "public/fonts/Inter-400.ttf"),
  500: path.join(process.cwd(), "public/fonts/Inter-500.ttf"),
  600: path.join(process.cwd(), "public/fonts/Inter-600.ttf"),
  700: path.join(process.cwd(), "public/fonts/Inter-700.ttf"),
  800: path.join(process.cwd(), "public/fonts/Inter-800.ttf"),
  900: path.join(process.cwd(), "public/fonts/Inter-900.ttf"),
};

const textToSvgCache = new Map<string, TextToSVG.Instance>();

interface TextMetrics {
  width: number;
}

type TextToSvgWithMetrics = TextToSVG.Instance & {
  getMetrics(text: string, options: { fontSize: number }): TextMetrics;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getTextToSvg(fontPath: string): TextToSVG.Instance {
  const cached = textToSvgCache.get(fontPath);
  if (cached) {
    return cached;
  }

  const instance = TextToSVG.loadSync(fontPath);
  textToSvgCache.set(fontPath, instance);
  return instance;
}

function containsMalayalam(text: string): boolean {
  return /[\u0d00-\u0d7f]/.test(text);
}

function nearestSupportedFontWeight(fontWeight: number): keyof typeof NOTO_SANS_FONT_PATHS {
  const normalized = Math.round(fontWeight / 100) * 100;
  return SUPPORTED_FONT_WEIGHTS.reduce((nearest, weight) =>
    Math.abs(weight - normalized) < Math.abs(nearest - normalized) ? weight : nearest,
  400);
}

function fontPathForText(text: string, layout: Pick<ResultTextBox, "fontFamily" | "fontWeight">): string {
  const family = layout.fontFamily.toLowerCase();
  const weight = nearestSupportedFontWeight(layout.fontWeight);
  if (containsMalayalam(text)) {
    return MALAYALAM_FONT_PATHS[weight];
  }
  if (family.includes("cooper")) {
    return COOPER_FONT_PATH;
  }
  if (family.includes("poppins")) {
    return POPPINS_FONT_PATHS[weight];
  }
  if (family.includes("montserrat")) {
    return MONTSERRAT_FONT_PATHS[weight];
  }
  if (family.includes("inter")) {
    return INTER_FONT_PATHS[weight];
  }
  if (family.includes("noto sans malayalam")) {
    return MALAYALAM_FONT_PATHS[weight];
  }

  return NOTO_SANS_FONT_PATHS[weight];
}

function safeSvgColor(color: string): string {
  return /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(color)
    ? color
    : "#111827";
}

function safeOpacity(value: number): number {
  return clamp(Number.isFinite(value) ? value : 1, 0, 1);
}

async function loadImageBuffer(imageRef: string): Promise<Buffer> {
  if (imageRef.startsWith("/")) {
    return fs.readFile(path.join(process.cwd(), "public", imageRef.replace(/^\/+/, "")));
  }

  const response = await fetch(imageRef);
  if (!response.ok) {
    throw new Error(`Could not load image asset: ${response.status}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

function buildDefaultBackground(width: number, height: number): string {
  return `
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stop-color="#fff7ed"/>
          <stop offset="0.58" stop-color="#f8fafc"/>
          <stop offset="1" stop-color="#ecfeff"/>
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#bg)"/>
      <circle cx="${width * 0.16}" cy="${height * 0.15}" r="${width * 0.22}" fill="#f97316" opacity="0.11"/>
      <circle cx="${width * 0.88}" cy="${height * 0.1}" r="${width * 0.18}" fill="#0891b2" opacity="0.10"/>
      <rect x="${width * 0.1}" y="${height * 0.39}" width="${width * 0.8}" height="${height * 0.51}" rx="${width * 0.035}" fill="#ffffff" stroke="#e5e7eb" stroke-width="2"/>
      <path d="M ${width * 0.14} ${height * 0.57} H ${width * 0.86}" stroke="#e5e7eb" stroke-width="2"/>
      <path d="M ${width * 0.14} ${height * 0.71} H ${width * 0.86}" stroke="#e5e7eb" stroke-width="2"/>
      <path d="M ${width * 0.14} ${height * 0.85} H ${width * 0.86}" stroke="#e5e7eb" stroke-width="2"/>
    `;
}

async function imageToDataUri(imageRef: string): Promise<string> {
  const buffer = await loadImageBuffer(imageRef);
  const metadata = await sharp(buffer).metadata();
  const format = metadata.format === "jpg" ? "jpeg" : metadata.format ?? "png";
  return `data:image/${format};base64,${buffer.toString("base64")}`;
}

function applyTransform(value: string, transform: ResultTextBox["textTransform"]): string {
  if (transform === "uppercase") {
    return value.toLocaleUpperCase("en-IN");
  }
  return value;
}

function formatResultNumber(resultNumber: number): string {
  return String(resultNumber).padStart(2, "0");
}

function getFieldValues(
  result: PublishedResult,
  template: ResultTemplateConfig,
): Record<ResultFieldKey, string> {
  const byPosition = new Map(result.entries.map((entry) => [entry.position, entry]));
  const first = byPosition.get(1);
  const second = byPosition.get(2);
  const third = byPosition.get(3);
  const hasFirst = Boolean(first?.name.trim());
  const hasSecond = Boolean(second?.name.trim());
  const hasThird = Boolean(third?.name.trim());

  return {
    resultNumber: formatResultNumber(result.resultNumber),
    categoryName: result.category,
    competitionName: getPublicCompetitionName(result.competitionName),
    firstPosition: hasFirst ? "1" : "",
    firstName: first?.name ?? "",
    firstUnit: first?.unit ?? "",
    secondPosition: hasSecond ? "2" : "",
    secondName: second?.name ?? "",
    secondUnit: second?.unit ?? "",
    thirdPosition: hasThird ? "3" : "",
    thirdName: third?.name ?? "",
    thirdUnit: third?.unit ?? "",
  };
}

function measureTextWidth(text: string, layout: ResultTextBox, fontSize: number): number {
  const fontPath = fontPathForText(text, layout);
  const textToSvg = getTextToSvg(fontPath) as TextToSvgWithMetrics;
  return textToSvg.getMetrics(text, { fontSize }).width;
}

function splitLongWord(word: string, layout: ResultTextBox, fontSize: number, maxWidth: number): string[] {
  const parts: string[] = [];
  let current = "";

  for (const char of [...word]) {
    const next = `${current}${char}`;
    if (current && measureTextWidth(next, layout, fontSize) > maxWidth) {
      parts.push(current);
      current = char;
    } else {
      current = next;
    }
  }

  if (current) {
    parts.push(current);
  }

  return parts;
}

function wrapText(text: string, layout: ResultTextBox, fontSize: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const fragments =
      measureTextWidth(word, layout, fontSize) > maxWidth
        ? splitLongWord(word, layout, fontSize, maxWidth)
        : [word];
    for (const fragment of fragments) {
      const next = current ? `${current} ${fragment}` : fragment;
      if (current && measureTextWidth(next, layout, fontSize) > maxWidth) {
        lines.push(current);
        current = fragment;
      } else {
        current = next;
      }
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines.length ? lines : [text];
}

function fitText(text: string, layout: ResultTextBox, width: number, height: number) {
  const maxFontSize = clamp(Math.round(layout.fontSize), 8, 180);
  const minFontSize = clamp(Math.round(layout.minFontSize), 8, maxFontSize);
  const maxWidth = Math.max(1, width - 8);

  for (let fontSize = maxFontSize; fontSize >= minFontSize; fontSize -= 1) {
    const lines = wrapText(text, layout, fontSize, maxWidth);
    const maxLines = Math.max(1, Math.floor(height / (fontSize * layout.lineHeight)));
    if (lines.length <= maxLines) {
      return { fontSize, lines };
    }
  }

  const maxLines = Math.max(1, Math.floor(height / (minFontSize * layout.lineHeight)));
  const lines = wrapText(text, layout, minFontSize, maxWidth).slice(0, maxLines);
  if (lines.length) {
    const last = lines[lines.length - 1];
    let truncated = last;
    while (truncated.length > 1 && measureTextWidth(`${truncated}...`, layout, minFontSize) > maxWidth) {
      truncated = truncated.slice(0, -1);
    }
    lines[lines.length - 1] = `${truncated.trim()}...`;
  }

  return { fontSize: minFontSize, lines };
}

function renderTextElement(
  rawText: string,
  layout: ResultTextBox,
  outputWidth: number,
  outputHeight: number,
  clipIndex: number,
): string {
  const text = applyTransform(rawText.trim(), layout.textTransform);
  if (!text) {
    return "";
  }

  const left = Math.round(outputWidth * clamp(layout.x, 0, 0.98));
  const top = Math.round(outputHeight * clamp(layout.y, 0, 0.98));
  const width = Math.max(1, Math.round(outputWidth * clamp(layout.width, 0.02, 1)));
  const height = Math.max(1, Math.round(outputHeight * clamp(layout.height, 0.02, 1)));
  const { fontSize, lines } = fitText(text, layout, width, height);
  const lineHeight = fontSize * clamp(layout.lineHeight, 0.9, 1.8);
  const totalTextHeight = lines.length * lineHeight;
  const firstBaseline =
    layout.verticalAlign === "top"
      ? fontSize * 0.9
      : layout.verticalAlign === "bottom"
        ? height - totalTextHeight + fontSize * 0.9
        : (height - totalTextHeight) / 2 + fontSize * 0.9;

  const textX = left + (layout.textAlign === "left" ? 0 : layout.textAlign === "right" ? width : width / 2);
  const anchor = `${layout.textAlign === "left" ? "left" : layout.textAlign === "right" ? "right" : "center"} baseline`;
  const clipId = `result-field-clip-${clipIndex}`;
  const pathLines = lines.map((line, index) => {
    const fontPath = fontPathForText(line, layout);
    const textToSvg = getTextToSvg(fontPath);
    return textToSvg.getPath(line, {
      x: textX,
      y: top + firstBaseline + index * lineHeight,
      fontSize,
      anchor,
      attributes: {
        fill: safeSvgColor(layout.color),
      },
    });
  }).join("");

  return `
    <clipPath id="${clipId}">
      <rect x="${left}" y="${top}" width="${width}" height="${height}" />
    </clipPath>
    <g clip-path="url(#${clipId})">${pathLines}</g>`;
}

async function renderMarkerElement(
  marker: ResultPositionMarker,
  outputWidth: number,
  outputHeight: number,
  clipIndex: number,
): Promise<string> {
  if (marker.mode === "hidden") {
    return "";
  }

  if (marker.mode === "text") {
    return renderTextElement(marker.text, marker.box, outputWidth, outputHeight, clipIndex);
  }

  if (marker.mode === "image") {
    if (!marker.imageUrl.trim()) {
      return "";
    }
    const left = Math.round(outputWidth * clamp(marker.x, 0, 0.98));
    const top = Math.round(outputHeight * clamp(marker.y, 0, 0.98));
    const width = Math.max(1, Math.round(outputWidth * clamp(marker.width, 0.005, 1)));
    const height = Math.max(1, Math.round(outputHeight * clamp(marker.height, 0.005, 1)));
    const cx = left + width / 2;
    const cy = top + height / 2;
    return `<image x="${left}" y="${top}" width="${width}" height="${height}" opacity="${safeOpacity(marker.opacity)}" transform="rotate(0 ${cx} ${cy})" preserveAspectRatio="xMidYMid meet" href="${await imageToDataUri(marker.imageUrl)}" />`;
  }

  const itemWidth = Math.max(1, Math.round(outputWidth * clamp(marker.width, 0.005, 1)));
  const itemHeight = Math.max(1, Math.round(outputHeight * clamp(marker.height, 0.005, 1)));
  const gap = marker.direction === "vertical"
    ? Math.round(outputHeight * clamp(marker.gap, 0, 0.2))
    : Math.round(outputWidth * clamp(marker.gap, 0, 0.2));
  const left = Math.round(outputWidth * clamp(marker.x, 0, 0.98));
  const top = Math.round(outputHeight * clamp(marker.y, 0, 0.98));
  const repeat = clamp(Math.round(marker.repeat), 1, 12);
  const groupWidth = marker.direction === "horizontal" ? repeat * itemWidth + (repeat - 1) * gap : itemWidth;
  const groupHeight = marker.direction === "vertical" ? repeat * itemHeight + (repeat - 1) * gap : itemHeight;
  const cx = left + groupWidth / 2;
  const cy = top + groupHeight / 2;
  const shapes = Array.from({ length: repeat }, (_, index) => {
    const x = left + (marker.direction === "horizontal" ? index * (itemWidth + gap) : 0);
    const y = top + (marker.direction === "vertical" ? index * (itemHeight + gap) : 0);
    const fill = safeSvgColor(marker.colors[index % marker.colors.length] ?? "#f43f5e");
    if (marker.shape === "circle") {
      return `<circle cx="${x + itemWidth / 2}" cy="${y + itemHeight / 2}" r="${Math.min(itemWidth, itemHeight) / 2}" fill="${fill}" />`;
    }
    const rx = marker.shape === "roundedSquare" ? Math.min(itemWidth, itemHeight) * 0.18 : 0;
    return `<rect x="${x}" y="${y}" width="${itemWidth}" height="${itemHeight}" rx="${rx}" fill="${fill}" />`;
  }).join("");

  return `<g opacity="${safeOpacity(marker.opacity)}" transform="rotate(${clamp(marker.rotation, -180, 180)} ${cx} ${cy})">${shapes}</g>`;
}

export async function renderResultPoster(
  result: PublishedResult,
  template: ResultTemplateConfig,
  ad?: ResultAdConfig | null,
): Promise<Buffer> {
  const width = clamp(Math.round(template.size.width), 720, 2160);
  const posterHeight = clamp(Math.round(template.size.posterHeight), 720, 2160);
  const adHeight = ad ? clamp(Math.round(template.size.adHeight), 120, 720) : 0;
  const values = getFieldValues(result, template);
  const backgroundLayer = template.backgroundImage
    ? `<image x="0" y="0" width="${width}" height="${posterHeight}" preserveAspectRatio="xMidYMid slice" href="${await imageToDataUri(template.backgroundImage)}" />`
    : buildDefaultBackground(width, posterHeight);
  const adLayer = ad
    ? `<rect x="0" y="${posterHeight}" width="${width}" height="${adHeight}" fill="#ffffff" />
       <image x="0" y="${posterHeight}" width="${width}" height="${adHeight}" preserveAspectRatio="xMidYMid meet" href="${await imageToDataUri(ad.imageUrl)}" />`
    : "";
  const byPosition = new Map(result.entries.map((entry) => [entry.position, entry]));
  const positionMarkers = template.positionMarkers ?? markerDefaultsFromFields(template.fields);
  const markerElements = (await Promise.all(RESULT_POSITION_KEYS.map((key, index) => {
    const position = key === "first" ? 1 : key === "second" ? 2 : 3;
    const entry = byPosition.get(position);
    if (!entry?.name.trim()) {
      return "";
    }
    return renderMarkerElement(positionMarkers[key], width, posterHeight, index + 100);
  }))).join("");
  const positionFieldKeys = new Set<ResultFieldKey>(["firstPosition", "secondPosition", "thirdPosition"]);
  const textElements = RESULT_FIELD_KEYS
    .filter((key) => !positionFieldKeys.has(key))
    .map((key, index) =>
      renderTextElement(values[key] ?? "", template.fields[key], width, posterHeight, index),
    )
    .join("");
  const outputHeight = posterHeight + adHeight;
  const svg = Buffer.from(`
    <svg width="${width}" height="${outputHeight}" viewBox="0 0 ${width} ${outputHeight}" xmlns="http://www.w3.org/2000/svg">
      ${backgroundLayer}
      ${markerElements}
      ${textElements}
      ${adLayer}
    </svg>`);

  return sharp(svg)
    .png({ compressionLevel: 6 })
    .toBuffer();
}
