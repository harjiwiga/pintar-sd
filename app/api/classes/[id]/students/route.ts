import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { suggestUsername, uniqueUsername } from "@/lib/studentAccount";

const AddStudentSchema = z.object({
  name: z.string().min(2).max(100),
  grade: z.number().int().min(1).max(6),
  pin: z.string().length(4).regex(/^\d{4}$/),
  avatarKey: z.string().optional(),
});

// GET /api/classes/[id]/students
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHENTICATED", message: "Silakan login." } }, { status: 401 });
  }

  const { id } = await params;
  const classroom = await prisma.classRoom.findFirst({
    where: { id, teacherId: session.user.id },
    include: { students: { orderBy: { name: "asc" } } },
  });

  if (!classroom) {
    return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Kelas tidak ditemukan." } }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: classroom.students });
}

// POST /api/classes/[id]/students — tambah siswa ke kelas
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHENTICATED", message: "Silakan login." } }, { status: 401 });
  }

  const { id } = await params;
  const classroom = await prisma.classRoom.findFirst({
    where: { id, teacherId: session.user.id },
  });
  if (!classroom) {
    return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Kelas tidak ditemukan." } }, { status: 404 });
  }

  const body = await req.json();
  const parsed = AddStudentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "Input tidak valid.", details: parsed.error.flatten() } },
      { status: 400 }
    );
  }

  const username = await uniqueUsername(suggestUsername(parsed.data.name, parsed.data.grade));

  const hashedPin = await bcrypt.hash(parsed.data.pin, 10);

  const student = await prisma.studentProfile.create({
    data: {
      name: parsed.data.name,
      grade: parsed.data.grade,
      username,
      pin: hashedPin,
      avatarKey: parsed.data.avatarKey,
      classId: classroom.id,
    },
  });

  return NextResponse.json(
    { success: true, data: { ...student, pin: undefined, username } },
    { status: 201 }
  );
}
