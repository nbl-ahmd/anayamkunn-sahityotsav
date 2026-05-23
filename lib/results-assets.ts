import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { put } from "@vercel/blob";

const LOCAL_GENERATED_DIR = path.join(process.cwd(), "public", "generated", "results");

export function isBlobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export async function persistGeneratedResultPoster(input: {
  resultId: string;
  resultNumber: number;
  buffer: Buffer;
}): Promise<string> {
  const key = `results/posters/result-${String(input.resultNumber).padStart(3, "0")}-${input.resultId}.png`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(key, input.buffer, {
      access: "public",
      addRandomSuffix: false,
      contentType: "image/png",
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    return blob.url;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("BLOB_READ_WRITE_TOKEN is required to publish result posters in production");
  }

  await fs.mkdir(LOCAL_GENERATED_DIR, { recursive: true });
  const fileName = `${Date.now()}-${randomUUID()}.png`;
  await fs.writeFile(path.join(LOCAL_GENERATED_DIR, fileName), input.buffer);
  return `/generated/results/${fileName}`;
}
