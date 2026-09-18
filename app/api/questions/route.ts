import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SaveQuestionSchema, QuestionFilterSchema } from "@/lib/validations/question";
import { requireUserId } from "@/lib/session";

// GET /api/questions — ambil bank soal dengan filter
export async function GET(req: NextRequest) {
  const session = await auth();
  const userId = requireUserId(session);
  if (!userId) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHENTICATED", message: "Silakan login." } }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const parsed = QuestionFilterSchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: { code: "VALIDATION_ERROR", message: "Filter tidak valid." } }, { status: 400 });
  }

  const { page, pageSize, search, ...filters } = parsed.data;
  const skip = (page - 1) * pageSize;

  const where = {
    ...(filters.topicId ? { topicId: filters.topicId } : {}),
    ...(filters.difficulty ? { difficulty: filters.difficulty } : {}),
    ...(filters.type ? { type: filters.type } : {}),
    ...(search ? { prompt: { contains: search, mode: "insensitive" as const } } : {}),
    ...(filters.grade ? { topic: { grade: filters.grade } } : {}),
  };

  const [questions, total] = await Promise.all([
    prisma.question.findMany({
      where,
      include: { topic: { include: { subject: true } }, createdBy: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.question.count({ where }),
  ]);

  return NextResponse.json({ success: true, data: questions, meta: { page, pageSize, total } });
}

// POST /api/questions — simpan soal (dari draf AI atau manual)
export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = requireUserId(session);
  if (!userId) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHENTICATED", message: "Silakan login." } }, { status: 401 });
  }

  const body = await req.json();
  const parsed = SaveQuestionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "Data soal tidak valid.", details: parsed.error.flatten() } },
      { status: 400 }
    );
  }

  const { figureId, ...rest } = parsed.data;
  if (figureId) {
    const figure = await prisma.materialFigure.findUnique({ where: { id: figureId }, select: { id: true } });
    if (!figure) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Gambar materi tidak ditemukan." } },
        { status: 400 }
      );
    }
  }

  const question = await prisma.question.create({
    data: { ...rest, figureId: figureId || null, createdById: userId },
    include: { topic: { include: { subject: true } }, figure: true },
  });

  return NextResponse.json({ success: true, data: question }, { status: 201 });
}
