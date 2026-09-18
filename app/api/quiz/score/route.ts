import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { scoreQuiz } from "@/lib/grader";
import { QuizScoreSchema } from "@/lib/validations/quiz";
import { requireUserId } from "@/lib/session";

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = requireUserId(session);
  if (!userId) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHENTICATED", message: "Silakan login." } },
      { status: 401 }
    );
  }

  const body = await req.json();
  const parsed = QuizScoreSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "Jawaban tidak valid." } },
      { status: 400 }
    );
  }

  const ids = parsed.data.answers.map((a) => a.questionId);
  const questions = await prisma.question.findMany({
    where: { id: { in: ids }, createdById: userId },
  });

  if (questions.length === 0) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Soal tidak ditemukan." } },
      { status: 404 }
    );
  }

  const byId = new Map(questions.map((q) => [q.id, q]));
  const items = parsed.data.answers.flatMap((answer) => {
    const question = byId.get(answer.questionId);
    if (!question) return [];
    return [
      {
        id: question.id,
        type: question.type,
        prompt: question.prompt,
        correctKey: question.correctKey,
        correctText: question.correctText,
        explanation: question.explanation,
        studentAnswer: answer.studentAnswer,
        weight: question.weight ?? 1,
      },
    ];
  });

  return NextResponse.json({ success: true, data: scoreQuiz(items) });
}
