import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureMaterialFigures, scoreFigureRelevance } from "@/lib/materialFigureExtractor";
import { requireUserId } from "@/lib/session";

// GET /api/materials/[id]/figures?prompt=...
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const userId = requireUserId(session);
  if (!userId) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHENTICATED", message: "Silakan login." } },
      { status: 401 }
    );
  }

  const { id } = await params;
  const material = await prisma.userMaterial.findFirst({
    where: {
      id,
      OR: [{ status: "READY" }, { uploadedById: userId }],
    },
    select: { id: true, status: true, fileName: true },
  });

  if (!material || material.status !== "READY") {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Dokumen tidak ditemukan." } },
      { status: 404 }
    );
  }

  await ensureMaterialFigures(id);

  const prompt = req.nextUrl.searchParams.get("prompt")?.trim() ?? "";
  const figures = await prisma.materialFigure.findMany({
    where: { materialId: id },
    orderBy: [{ pageNumber: "asc" }, { areaRatio: "desc" }],
  });

  const ranked = figures
    .map((fig) => ({
      id: fig.id,
      pageNumber: fig.pageNumber,
      width: fig.width,
      height: fig.height,
      nearbyText: fig.nearbyText,
      areaRatio: fig.areaRatio,
      url: `/api/figures/${fig.id}`,
      relevance: prompt ? scoreFigureRelevance(prompt, fig.nearbyText) : 0,
    }))
    .sort((a, b) => {
      if (prompt) {
        const diff = b.relevance - a.relevance;
        if (Math.abs(diff) > 0.001) return diff;
      }
      return b.areaRatio - a.areaRatio;
    });

  return NextResponse.json({
    success: true,
    data: {
      materialId: id,
      fileName: material.fileName,
      figures: ranked,
    },
  });
}
