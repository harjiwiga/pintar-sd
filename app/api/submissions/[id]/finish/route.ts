import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { scoreQuiz } from "@/lib/grader";
import { requireStudentProfileId } from "@/lib/session";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const studentProfileId = requireStudentProfileId(session);
  if (!studentProfileId) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHENTICATED", message: "Silakan login." } }, { status: 401 });
  }

  const { id } = await params;
  const submission = await prisma.submission.findUnique({
    where: { id },
    include: {
      answers: true,
      assignment: {
        include: { questions: { include: { question: true }, orderBy: { order: "asc" } } },
      },
    },
  });

  if (!submission || submission.studentId !== studentProfileId) {
    return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Submission tidak ditemukan." } }, { status: 404 });
  }
  if (submission.submittedAt) {
    return NextResponse.json({ success: false, error: { code: "CONFLICT", message: "Submission sudah selesai." } }, { status: 409 });
  }

  const answerByQuestion = new Map(submission.answers.map((answer) => [answer.questionId, answer]));
  const items = submission.assignment.questions.map((item) => {
    const answer = answerByQuestion.get(item.questionId);
    return {
      id: item.question.id,
      type: item.question.type,
      prompt: item.question.prompt,
      correctKey: item.question.correctKey,
      correctText: item.question.correctText,
      explanation: item.question.explanation,
      studentAnswer: answer?.answerText ?? "",
      weight: item.question.weight,
    };
  });

  const graded = scoreQuiz(items);

  const updated = await prisma.submission.update({
    where: { id },
    data: { submittedAt: new Date(), score: graded.score },
  });

  return NextResponse.json({
    success: true,
    data: {
      ...updated,
      totalAnswers: submission.answers.length,
      correctCount: graded.correctCount,
      total: graded.total,
      results: graded.results,
    },
  });
}
