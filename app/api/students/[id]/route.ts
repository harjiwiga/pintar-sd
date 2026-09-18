import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

const ResetPinSchema = z.object({ newPin: z.string().length(4).regex(/^\d{4}$/) });

// POST /api/students/[id]/reset-pin — guru/ortu reset PIN siswa
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, error: { code: "UNAUTHENTICATED", message: "Silakan login." } }, { status: 401 });

  const { id } = await params;
  const student = await prisma.studentProfile.findUnique({
    where: { id },
    include: { classRoom: true },
  });
  if (!student) {
    return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Siswa tidak ditemukan." } }, { status: 404 });
  }

  const isTeacher = student.classRoom?.teacherId === session.user.id;
  const isParent = student.parentId === session.user.id;
  if (!isTeacher && !isParent) {
    return NextResponse.json({ success: false, error: { code: "FORBIDDEN", message: "Tidak boleh mereset PIN siswa ini." } }, { status: 403 });
  }

  const body = await req.json();
  const parsed = ResetPinSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ success: false, error: { code: "VALIDATION_ERROR", message: "PIN tidak valid." } }, { status: 400 });

  const hashedPin = await bcrypt.hash(parsed.data.newPin, 10);
  await prisma.studentProfile.update({ where: { id }, data: { pin: hashedPin } });

  return NextResponse.json({ success: true, data: { message: "PIN berhasil direset." } });
}
