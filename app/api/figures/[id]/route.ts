import fs from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireUserId, requireStudentProfileId } from "@/lib/session";

// GET /api/figures/[id] — stream gambar crop (guru/ortu/siswa yang login)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const userId = requireUserId(session);
  const studentId = requireStudentProfileId(session);
  if (!userId && !studentId) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHENTICATED", message: "Silakan login." } },
      { status: 401 }
    );
  }

  const { id } = await params;
  const figure = await prisma.materialFigure.findUnique({
    where: { id },
    select: { fileUrl: true, width: true, height: true },
  });
  if (!figure) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Gambar tidak ditemukan." } },
      { status: 404 }
    );
  }

  const absolute = path.isAbsolute(figure.fileUrl)
    ? figure.fileUrl
    : path.join(process.cwd(), figure.fileUrl);

  try {
    const buffer = await fs.readFile(absolute);
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "private, max-age=3600",
        "Content-Length": String(buffer.length),
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "File gambar tidak ada." } },
      { status: 404 }
    );
  }
}
