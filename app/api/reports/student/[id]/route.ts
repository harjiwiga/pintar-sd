import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/reports/student/[id] — riwayat & progres individual siswa
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, error: { code: "UNAUTHENTICATED", message: "Silakan login." } }, { status: 401 });

  const { id } = await params;

  const submissions = await prisma.submission.findMany({
    where: { studentId: id, submittedAt: { not: null } },
    include: {
      assignment: { select: { title: true, dueDate: true } },
      answers: {
        include: {
          // tidak perlu relasi tambahan untuk laporan sederhana
        },
      },
    },
    orderBy: { submittedAt: "desc" },
  });

  const history = submissions.map((s) => ({
    assignmentTitle: s.assignment.title,
    score: s.score,
    submittedAt: s.submittedAt,
    totalQuestions: s.answers.length,
    correctAnswers: s.answers.filter((a) => a.isCorrect).length,
  }));

  return NextResponse.json({ success: true, data: history });
}
