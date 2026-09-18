import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireStudentProfileId } from "@/lib/session";

function publicQuestion(
  question: {
    id: string;
    type: string;
    prompt: string;
    choices: unknown;
    difficulty: string;
    weight: number;
    figureId?: string | null;
    topic: { name: string; grade: number; subject: { name: string } };
    correctKey: string | null;
    correctText: string | null;
    explanation: string;
  },
  reveal: boolean
) {
  return {
    id: question.id,
    type: question.type,
    prompt: question.prompt,
    choices: question.choices,
    difficulty: question.difficulty,
    weight: question.weight,
    topic: question.topic.name,
    subject: question.topic.subject.name,
    grade: question.topic.grade,
    figureId: question.figureId ?? null,
    imageUrl: question.figureId ? `/api/figures/${question.figureId}` : null,
    ...(reveal
      ? {
          correctKey: question.correctKey,
          correctText: question.correctText,
          explanation: question.explanation,
        }
      : {}),
  };
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const studentId = requireStudentProfileId(session);
  if (!studentId) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHENTICATED", message: "Silakan masuk sebagai siswa." } },
      { status: 401 }
    );
  }

  const { id } = await params;
  const student = await prisma.studentProfile.findUnique({
    where: { id: studentId },
    select: { classId: true },
  });
  if (!student?.classId) {
    return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Tugas tidak ditemukan." } }, { status: 404 });
  }

  const assignment = await prisma.assignment.findFirst({
    where: { id, classId: student.classId },
    include: {
      classRoom: { select: { name: true } },
      questions: {
        include: { question: { include: { topic: { include: { subject: true } } } } },
        orderBy: { order: "asc" },
      },
    },
  });
  if (!assignment) {
    return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Tugas tidak ditemukan." } }, { status: 404 });
  }

  const submission = await prisma.submission.findFirst({
    where: { assignmentId: id, studentId },
    include: { answers: true },
    orderBy: { startedAt: "desc" },
  });

  const reveal = Boolean(submission?.submittedAt);

  return NextResponse.json({
    success: true,
    data: {
      id: assignment.id,
      title: assignment.title,
      dueDate: assignment.dueDate,
      className: assignment.classRoom.name,
      questions: assignment.questions.map((item) => publicQuestion(item.question, reveal)),
      submission: submission
        ? {
            id: submission.id,
            startedAt: submission.startedAt,
            submittedAt: submission.submittedAt,
            score: submission.score,
            answers: submission.answers.map((answer) => ({
              questionId: answer.questionId,
              answerText: answer.answerText,
              isCorrect: reveal ? answer.isCorrect : undefined,
            })),
          }
        : null,
    },
  });
}
