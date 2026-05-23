import { NextResponse } from "next/server";
import { getPublicResultsSnapshot } from "@/lib/results-store";

export const runtime = "nodejs";

export async function GET() {
  try {
    return NextResponse.json(await getPublicResultsSnapshot());
  } catch (error) {
    console.error("Failed to load public results", error);
    return NextResponse.json({ error: "Failed to load results" }, { status: 500 });
  }
}
