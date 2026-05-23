import { NextRequest, NextResponse } from "next/server";
import { renderPublishedResultPoster } from "@/lib/results-store";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const templateId = req.nextUrl.searchParams.get("templateId") ?? undefined;
    const { buffer, result } = await renderPublishedResultPoster({ resultId: id, templateId });
    const filename = `result-${String(result.resultNumber).padStart(2, "0")}-${result.programId}.png`;

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "public, max-age=300, s-maxage=86400",
      },
    });
  } catch (error) {
    console.error("Failed to render public result poster", error);
    return NextResponse.json({ error: "Poster not found" }, { status: 404 });
  }
}
