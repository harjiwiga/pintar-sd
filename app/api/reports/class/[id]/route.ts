import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/reports/class/[id] — rekap nilai kelas per topik
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, error: { code: "UNAUTHENTICATED", message: "Silakan login." } }, { status: 401 });

  const { id } = await params;
  const classroom = await prisma.classRoom.findFirst({
    where: { id, teacherId: session.user.id },
  });
  if (!classroom) return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Kelas tidak ditemukan." } }, { status: 404 });

  const submissions = await prisma.submission.findMany({
    where: { assignment: { classId: id }, submittedAt: { not: null } },
    include: {
      student: { select: { id: true, name: true } },
      answers: { include: { submission: { select: { id: true } } } },
      assignment: { select: { title: true } },
    },
    orderBy: { submittedAt: "desc" },
  });

  const report = submissions.map((s) => ({
    studentId: s.studentId,
    studentName: s.student.name,
    assignmentTitle: s.assignment.title,
    score: s.score,
    submittedAt: s.submittedAt,
    totalAnswers: s.answers.length,
    correctAnswers: s.answers.filter((a) => a.isCorrect).length,
  }));

  return NextResponse.json({ success: true, data: report });
}
