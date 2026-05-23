import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE_NAME, isValidAdminSessionToken } from "@/lib/admin-auth";
import { RESULT_PROGRAMS } from "@/lib/result-programs";
import { saveResultAd } from "@/lib/results-store";
import { ResultTemplateScopeType, SaveResultAdInput } from "@/lib/results-types";

export const runtime = "nodejs";

function isAuthorized(req: NextRequest): boolean {
  const session = req.cookies.get(ADMIN_SESSION_COOKIE_NAME)?.value;
  return isValidAdminSessionToken(session);
}

function normalizeScopeType(value: unknown): ResultTemplateScopeType {
  return value === "category" || value === "program" || value === "global" ? value : "global";
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

    const body = await req.json() as Partial<SaveResultAdInput>;
    const scopeType = normalizeScopeType(body.scopeType);
    const scopeValue = normalizeScopeValue(scopeType, body.scopeValue);
    const rangeStart = Math.max(1, Math.floor(Number(body.rangeStart ?? 1)));
    const rangeEnd = Math.max(rangeStart, Math.floor(Number(body.rangeEnd ?? rangeStart)));

    if (scopeType !== "global" && !scopeValue) {
      return NextResponse.json({ error: "A valid scope target is required" }, { status: 400 });
    }
    if (!body.imageUrl || typeof body.imageUrl !== "string") {
      return NextResponse.json({ error: "Ad image is required" }, { status: 400 });
    }

    const input: SaveResultAdInput = {
      id: typeof body.id === "string" && body.id ? body.id : undefined,
      name: typeof body.name === "string" && body.name.trim() ? body.name.trim().slice(0, 80) : "Sponsor Ad",
      imageUrl: body.imageUrl.trim(),
      rangeStart,
      rangeEnd,
      scopeType,
      scopeValue,
      active: body.active ?? true,
    };

    const ad = await saveResultAd(input);
    return NextResponse.json({ ad });
  } catch (error) {
    console.error("Failed to save result ad", error);
    return NextResponse.json({ error: "Failed to save result ad" }, { status: 500 });
  }
}
