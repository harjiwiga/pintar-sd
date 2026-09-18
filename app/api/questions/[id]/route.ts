import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UpdateQuestionSchema } from "@/lib/validations/question";

// PUT /api/questions/[id]
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, error: { code: "UNAUTHENTICATED", message: "Silakan login." } }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.question.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Soal tidak ditemukan." } }, { status: 404 });
  if (existing.createdById !== session.user.id) return NextResponse.json({ success: false, error: { code: "FORBIDDEN", message: "Tidak memiliki akses." } }, { status: 403 });

  const body = await req.json();
  const parsed = UpdateQuestionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ success: false, error: { code: "VALIDATION_ERROR", message: "Data tidak valid." } }, { status: 400 });

  const updated = await prisma.question.update({ where: { id }, data: parsed.data });
  return NextResponse.json({ success: true, data: updated });
}

// DELETE /api/questions/[id]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, error: { code: "UNAUTHENTICATED", message: "Silakan login." } }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.question.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Soal tidak ditemukan." } }, { status: 404 });
  if (existing.createdById !== session.user.id) return NextResponse.json({ success: false, error: { code: "FORBIDDEN", message: "Tidak memiliki akses." } }, { status: 403 });

  await prisma.question.delete({ where: { id } });
  return NextResponse.json({ success: true, data: { id } });
}
