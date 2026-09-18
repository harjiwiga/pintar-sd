import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireStudentProfileId } from "@/lib/session";

export async function GET() {
  const session = await auth();
  const studentId = requireStudentProfileId(session);
  if (!studentId) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHENTICATED", message: "Silakan masuk sebagai siswa." } },
      { status: 401 }
    );
  }

  const student = await prisma.studentProfile.findUnique({
    where: { id: studentId },
    select: { id: true, classId: true, name: true, grade: true },
  });
  if (!student) {
    return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Profil siswa tidak ditemukan." } }, { status: 404 });
  }
  if (!student.classId) {
    return NextResponse.json({ success: true, data: [] });
  }

  const assignments = await prisma.assignment.findMany({
    where: { classId: student.classId },
    include: {
      _count: { select: { questions: true } },
      submissions: {
        where: { studentId },
        select: { id: true, score: true, submittedAt: true, startedAt: true },
        orderBy: { startedAt: "desc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    success: true,
    data: assignments.map((item) => {
      const submission = item.submissions[0] ?? null;
      return {
        id: item.id,
        title: item.title,
        dueDate: item.dueDate,
        createdAt: item.createdAt,
        questionCount: item._count.questions,
        submission,
        status: submission?.submittedAt ? "done" : submission ? "started" : "new",
      };
    }),
  });
}
