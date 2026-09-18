import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CreateSubmissionSchema } from "@/lib/validations/submission";
import { requireStudentProfileId } from "@/lib/session";

export async function POST(req: NextRequest) {
  const session = await auth();
  const studentProfileId = requireStudentProfileId(session);
  if (!studentProfileId) {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "Hanya siswa yang dapat mengerjakan soal." } },
      { status: 403 }
    );
  }

  const body = await req.json();
  const parsed = CreateSubmissionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: { code: "VALIDATION_ERROR", message: "Data tidak valid." } }, { status: 400 });
  }

  const student = await prisma.studentProfile.findUnique({
    where: { id: studentProfileId },
    select: { classId: true },
  });

  const assignment = await prisma.assignment.findFirst({
    where: { id: parsed.data.assignmentId, classId: student?.classId ?? "__none__" },
    include: {
      questions: { include: { question: true }, orderBy: { order: "asc" } },
    },
  });
  if (!assignment) {
    return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Tugas tidak ditemukan." } }, { status: 404 });
  }

  const existing = await prisma.submission.findFirst({
    where: { assignmentId: parsed.data.assignmentId, studentId: studentProfileId },
    include: {
      assignment: {
        include: { questions: { include: { question: true }, orderBy: { order: "asc" } } },
      },
      answers: true,
    },
    orderBy: { startedAt: "desc" },
  });
  if (existing) return NextResponse.json({ success: true, data: existing });

  const submission = await prisma.submission.create({
    data: { assignmentId: parsed.data.assignmentId, studentId: studentProfileId },
    include: {
      assignment: {
        include: { questions: { include: { question: true }, orderBy: { order: "asc" } } },
      },
      answers: true,
    },
  });

  return NextResponse.json({ success: true, data: submission }, { status: 201 });
}
