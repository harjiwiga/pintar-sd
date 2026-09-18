
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { requireUserId } from "@/lib/session";

export async function GET(req: NextRequest) {
  const session = await auth();
  const userId = requireUserId(session);
  if (!userId) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHENTICATED", message: "Silakan login." } },
      { status: 401 }
    );
  }

  try {
    const subject = req.nextUrl.searchParams.get("subject")?.trim() || "";
    const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? 20) || 20, 30);

    const [catalog, owned] = await Promise.all([
      prisma.subject.findMany({
        select: { name: true },
        orderBy: { name: "asc" },
      }),
      prisma.question.findMany({
        where: { createdById: userId },
        select: { topic: { select: { subject: { select: { name: true } } } } },
      }),
    ]);

    const counts = new Map<string, number>();
    for (const row of owned) {
      const name = row.topic.subject.name;
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    const subjects = catalog.map((item) => ({
      name: item.name,
      count: counts.get(item.name) ?? 0,
    }));

    if (!subject) {
      return NextResponse.json({
        success: true,
        data: [],
        meta: { subjects },
      });
    }

    const where: Prisma.QuestionWhereInput = {
      createdById: userId,
      topic: { subject: { name: subject } },
    };

    const [mcq, written] = await Promise.all([
      prisma.question.findMany({
        where: { ...where, type: "MULTIPLE_CHOICE" },
        include: { topic: { include: { subject: true } } },
        orderBy: { createdAt: "desc" },
        take: Math.ceil(limit * 0.6),
      }),
      prisma.question.findMany({
        where: { ...where, type: { in: ["ESSAY", "SHORT_ANSWER"] } },
        include: { topic: { include: { subject: true } } },
        orderBy: { createdAt: "desc" },
        take: Math.max(1, Math.floor(limit * 0.4)),
      }),
    ]);

    const combined = [...mcq, ...written].slice(0, limit);
    const questions =
      combined.length > 0
        ? combined
        : await prisma.question.findMany({
            where,
            include: { topic: { include: { subject: true } } },
            orderBy: { createdAt: "desc" },
            take: limit,
          });

    return NextResponse.json({
      success: true,
      data: questions.map((q) => ({
        id: q.id,
        type: q.type,
        prompt: q.prompt,
        choices: q.choices,
        difficulty: q.difficulty,
        topic: q.topic.name,
        subject: q.topic.subject.name,
        grade: q.topic.grade,
        weight: q.weight ?? 1,
        figureId: q.figureId,
        imageUrl: q.figureId ? `/api/figures/${q.figureId}` : null,
      })),
      meta: { subjects, subject },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Gagal memuat soal." } },
      { status: 500 }
    );
  }
}
