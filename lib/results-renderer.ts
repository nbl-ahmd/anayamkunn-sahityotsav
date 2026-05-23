import { promises as fs } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import sharp from "sharp";
import {
  RESULT_FIELD_KEYS,
  ResultAdConfig,
  ResultFieldKey,
  PublishedResult,
  ResultTemplateConfig,
  ResultTextBox,
} from "@/lib/results-types";

const LATIN_FONT_PATH = path.join(process.cwd(), "public/fonts/NotoSans-Regular.ttf");
const MALAYALAM_REGULAR_FONT_PATH = path.join(process.cwd(), "public/fonts/NotoSansMalayalam-Regular.ttf");
const MALAYALAM_BOLD_FONT_PATH = path.join(process.cwd(), "public/fonts/NotoSansMalayalam-Bold.ttf");

let fontCssPromise: Promise<string> | null = null;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function getFontCss(): Promise<string> {
  if (!fontCssPromise) {
    const latinUrl = pathToFileURL(LATIN_FONT_PATH).href;
    const malayalamRegularUrl = pathToFileURL(MALAYALAM_REGULAR_FONT_PATH).href;
    const malayalamBoldUrl = pathToFileURL(MALAYALAM_BOLD_FONT_PATH).href;
    fontCssPromise = Promise.resolve(`
      @font-face {
        font-family: "PosterLatin";
        src: url("${latinUrl}") format("truetype");
        font-weight: 100 900;
      }
      @font-face {
        font-family: "PosterMalayalam";
        src: url("${malayalamRegularUrl}") format("truetype");
        font-weight: 400 600;
      }
      @font-face {
        font-family: "PosterMalayalam";
        src: url("${malayalamBoldUrl}") format("truetype");
        font-weight: 700 900;
      }
      @font-face {
        font-family: "Noto Sans Malayalam";
        src: url("${malayalamRegularUrl}") format("truetype");
        font-weight: 400 600;
      }
      @font-face {
        font-family: "Noto Sans Malayalam";
        src: url("${malayalamBoldUrl}") format("truetype");
        font-weight: 700 900;
      }
    `);
  }

  return fontCssPromise;
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

function formatResultNumber(resultNumber: number, format: ResultTemplateConfig["resultNumberFormat"]): string {
  const padded = String(resultNumber).padStart(2, "0");
  return format === "number" ? padded : `Result ${padded}`;
}

function getFieldValues(
  result: PublishedResult,
  template: ResultTemplateConfig,
): Record<ResultFieldKey, string> {
  const byPosition = new Map(result.entries.map((entry) => [entry.position, entry]));
  const first = byPosition.get(1);
  const second = byPosition.get(2);
  const third = byPosition.get(3);

  return {
    resultNumber: formatResultNumber(result.resultNumber, template.resultNumberFormat),
    categoryName: result.category,
    competitionName: result.competitionName,
    firstPosition: "1",
    firstName: first?.name ?? "",
    firstUnit: first?.unit ?? "",
    secondPosition: "2",
    secondName: second?.name ?? "",
    secondUnit: second?.unit ?? "",
    thirdPosition: "3",
    thirdName: third?.name ?? "",
    thirdUnit: third?.unit ?? "",
  };
}

function charWidthUnit(char: string): number {
  if (/\s/.test(char)) return 0.34;
  if (/[\u0d00-\u0d7f]/.test(char)) return 0.82;
  if (/[A-Z0-9]/.test(char)) return 0.62;
  return 0.54;
}

function measureUnits(text: string): number {
  return [...text].reduce((sum, char) => sum + charWidthUnit(char), 0);
}

function splitLongWord(word: string, maxUnits: number): string[] {
  const parts: string[] = [];
  let current = "";
  let currentUnits = 0;

  for (const char of [...word]) {
    const nextUnits = charWidthUnit(char);
    if (current && currentUnits + nextUnits > maxUnits) {
      parts.push(current);
      current = char;
      currentUnits = nextUnits;
    } else {
      current += char;
      currentUnits += nextUnits;
    }
  }

  if (current) {
    parts.push(current);
  }

  return parts;
}

function wrapText(text: string, maxUnits: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const fragments = measureUnits(word) > maxUnits ? splitLongWord(word, maxUnits) : [word];
    for (const fragment of fragments) {
      const next = current ? `${current} ${fragment}` : fragment;
      if (current && measureUnits(next) > maxUnits) {
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

  for (let fontSize = maxFontSize; fontSize >= minFontSize; fontSize -= 1) {
    const maxUnits = Math.max(1, (width - 8) / fontSize);
    const lines = wrapText(text, maxUnits);
    const maxLines = Math.max(1, Math.floor(height / (fontSize * layout.lineHeight)));
    if (lines.length <= maxLines) {
      return { fontSize, lines };
    }
  }

  const maxUnits = Math.max(1, (width - 8) / minFontSize);
  const maxLines = Math.max(1, Math.floor(height / (minFontSize * layout.lineHeight)));
  const lines = wrapText(text, maxUnits).slice(0, maxLines);
  if (lines.length) {
    const last = lines[lines.length - 1];
    let truncated = last;
    while (truncated.length > 1 && measureUnits(`${truncated}...`) > maxUnits) {
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

  const textAnchor =
    layout.textAlign === "left" ? "start" : layout.textAlign === "right" ? "end" : "middle";
  const textX = left + (layout.textAlign === "left" ? 0 : layout.textAlign === "right" ? width : width / 2);
  const clipId = `result-field-clip-${clipIndex}`;
  const tspanLines = lines
    .map(
      (line, index) =>
        `<tspan x="${textX}" y="${top + firstBaseline + index * lineHeight}">${escapeXml(line)}</tspan>`,
    )
    .join("");

  return `
    <clipPath id="${clipId}">
      <rect x="${left}" y="${top}" width="${width}" height="${height}" />
    </clipPath>
    <text
      clip-path="url(#${clipId})"
      fill="${escapeXml(layout.color)}"
      font-family="PosterLatin, PosterMalayalam, ${escapeXml(layout.fontFamily)}, sans-serif"
      font-size="${fontSize}"
      font-weight="${layout.fontWeight}"
      text-anchor="${textAnchor}"
    >${tspanLines}</text>`;
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
  const fontCss = await getFontCss();
  const backgroundLayer = template.backgroundImage
    ? `<image x="0" y="0" width="${width}" height="${posterHeight}" preserveAspectRatio="xMidYMid slice" href="${await imageToDataUri(template.backgroundImage)}" />`
    : buildDefaultBackground(width, posterHeight);
  const adLayer = ad
    ? `<rect x="0" y="${posterHeight}" width="${width}" height="${adHeight}" fill="#ffffff" />
       <image x="0" y="${posterHeight}" width="${width}" height="${adHeight}" preserveAspectRatio="xMidYMid meet" href="${await imageToDataUri(ad.imageUrl)}" />`
    : "";
  const textElements = RESULT_FIELD_KEYS
    .map((key, index) =>
      renderTextElement(values[key] ?? "", template.fields[key], width, posterHeight, index),
    )
    .join("");
  const outputHeight = posterHeight + adHeight;
  const svg = Buffer.from(`
    <svg width="${width}" height="${outputHeight}" viewBox="0 0 ${width} ${outputHeight}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <style>
          ${fontCss}
          text {
            font-family: "PosterLatin", "PosterMalayalam", sans-serif;
            paint-order: stroke fill;
          }
        </style>
      </defs>
      ${backgroundLayer}
      ${textElements}
      ${adLayer}
    </svg>`);

  return sharp(svg)
    .png({ compressionLevel: 6 })
    .toBuffer();
}
