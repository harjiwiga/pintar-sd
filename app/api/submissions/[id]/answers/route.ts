import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { gradeAnswer } from "@/lib/grader";
import { SubmitAnswerSchema } from "@/lib/validations/submission";
import { requireStudentProfileId } from "@/lib/session";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const studentProfileId = requireStudentProfileId(session);
  if (!studentProfileId) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHENTICATED", message: "Silakan login." } }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = SubmitAnswerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: { code: "VALIDATION_ERROR", message: "Data tidak valid." } }, { status: 400 });
  }

  const submission = await prisma.submission.findUnique({ where: { id } });
  if (!submission || submission.studentId !== studentProfileId) {
    return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Submission tidak ditemukan." } }, { status: 404 });
  }
  if (submission.submittedAt) {
    return NextResponse.json({ success: false, error: { code: "CONFLICT", message: "Submission sudah ditutup." } }, { status: 409 });
  }

  const assigned = await prisma.assignmentQuestion.findFirst({
    where: { assignmentId: submission.assignmentId, questionId: parsed.data.questionId },
  });
  if (!assigned) {
    return NextResponse.json({ success: false, error: { code: "FORBIDDEN", message: "Soal bukan bagian dari tugas ini." } }, { status: 403 });
  }

  const question = await prisma.question.findUnique({ where: { id: parsed.data.questionId } });
  if (!question) {
    return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Soal tidak ditemukan." } }, { status: 404 });
  }

  const isCorrect = gradeAnswer({
    questionType: question.type,
    correctKey: question.correctKey,
    correctText: question.correctText,
    studentAnswer: parsed.data.answerText,
  });

  const answer = await prisma.answer.upsert({
    where: {
      submissionId_questionId: { submissionId: id, questionId: parsed.data.questionId },
    },
    update: { answerText: parsed.data.answerText, isCorrect },
    create: { submissionId: id, questionId: parsed.data.questionId, answerText: parsed.data.answerText, isCorrect },
  });

  return NextResponse.json({
    success: true,
    data: {
      ...answer,
      explanation: question.explanation,
      correctKey: question.correctKey,
      correctText: question.correctText,
    },
  });
}
