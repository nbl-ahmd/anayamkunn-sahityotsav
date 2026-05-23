import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE_NAME, isValidAdminSessionToken } from "@/lib/admin-auth";
import { UNIT_LIST } from "@/lib/constants";
import { getAdminResultsSnapshot, publishResult } from "@/lib/results-store";
import { PublishResultInput, ResultEntry } from "@/lib/results-types";
import { UnitName } from "@/lib/types";

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
    if (input.entries.some((entry) => !entry.name)) {
      return NextResponse.json({ error: "Winner names are required" }, { status: 400 });
    }

    const result = await publishResult(input);
    return NextResponse.json({ result });
  } catch (error) {
    console.error("Failed to publish result", error);
    return NextResponse.json({ error: "Failed to publish result" }, { status: 500 });
  }
}
