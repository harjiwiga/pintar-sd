import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { findClassByJoinCode, StudentPinSchema, StudentUsernameSchema } from "@/lib/studentAccount";

const RegisterSiswaSchema = z.object({
  name: z.string().trim().min(2).max(100),
  grade: z.number().int().min(1).max(6),
  username: StudentUsernameSchema,
  pin: StudentPinSchema,
  joinCode: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = RegisterSiswaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "Data pendaftaran tidak valid." } },
      { status: 400 }
    );
  }

  const existing = await prisma.studentProfile.findUnique({
    where: { username: parsed.data.username },
  });
  if (existing) {
    return NextResponse.json(
      { success: false, error: { code: "CONFLICT", message: "Username sudah dipakai. Pilih yang lain." } },
      { status: 409 }
    );
  }

  let classId: string | undefined;
  if (parsed.data.joinCode?.trim()) {
    const classroom = await findClassByJoinCode(parsed.data.joinCode);
    if (!classroom) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Kode kelas tidak ditemukan." } },
        { status: 404 }
      );
    }
    classId = classroom.id;
  }

  const student = await prisma.studentProfile.create({
    data: {
      name: parsed.data.name,
      grade: parsed.data.grade,
      username: parsed.data.username,
      pin: await bcrypt.hash(parsed.data.pin, 10),
      classId,
    },
    select: { id: true, name: true, username: true, grade: true, classId: true },
  });

  return NextResponse.json({ success: true, data: student }, { status: 201 });
}
