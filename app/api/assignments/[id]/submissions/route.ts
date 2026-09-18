import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/assignments/[id]/submissions — guru melihat rekap pengerjaan
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, error: { code: "UNAUTHENTICATED", message: "Silakan login." } }, { status: 401 });

  const { id } = await params;

  const assignment = await prisma.assignment.findFirst({
    where: { id, classRoom: { teacherId: session.user.id } },
  });
  if (!assignment) return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Penugasan tidak ditemukan." } }, { status: 404 });

  const submissions = await prisma.submission.findMany({
    where: { assignmentId: id },
    include: {
      student: { select: { id: true, name: true, grade: true } },
      _count: { select: { answers: true } },
    },
    orderBy: { startedAt: "desc" },
  });

  return NextResponse.json({ success: true, data: submissions });
}
