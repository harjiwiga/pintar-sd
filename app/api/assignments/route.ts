import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CreateAssignmentSchema } from "@/lib/validations/assignment";
import { requireUserId } from "@/lib/session";

export async function GET() {
  const session = await auth();
  const userId = requireUserId(session);
  if (!userId) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHENTICATED", message: "Silakan login." } }, { status: 401 });
  }

  const assignments = await prisma.assignment.findMany({
    where: { classRoom: { teacherId: userId } },
    include: {
      classRoom: true,
      _count: { select: { questions: true, submissions: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ success: true, data: assignments });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = requireUserId(session);
  if (!userId) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHENTICATED", message: "Silakan login." } }, { status: 401 });
  }

  const body = await req.json();
  const parsed = CreateAssignmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "Data tidak valid.", details: parsed.error.flatten() } },
      { status: 400 }
    );
  }

  const { title, classId, questionIds, dueDate } = parsed.data;

  const classroom = await prisma.classRoom.findFirst({
    where: { id: classId, teacherId: userId },
  });
  if (!classroom) {
    return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Kelas tidak ditemukan." } }, { status: 404 });
  }

  const ownedQuestions = await prisma.question.count({
    where: { id: { in: questionIds }, createdById: userId },
  });
  if (ownedQuestions !== questionIds.length) {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "Beberapa soal tidak ada di bank soal Anda." } },
      { status: 403 }
    );
  }

  const assignment = await prisma.assignment.create({
    data: {
      title,
      classId,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      questions: {
        create: questionIds.map((qid, idx) => ({
          questionId: qid,
          order: idx + 1,
        })),
      },
    },
    include: { questions: { include: { question: true } } },
  });

  return NextResponse.json({ success: true, data: assignment }, { status: 201 });
}
