import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/subjects — daftar mata pelajaran beserta topik per kelas
export async function GET() {
  try {
    const subjects = await prisma.subject.findMany({
      include: {
        topics: { orderBy: [{ grade: "asc" }, { name: "asc" }] },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ success: true, data: subjects });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Gagal mengambil data mata pelajaran." } },
      { status: 500 }
    );
  }
}
