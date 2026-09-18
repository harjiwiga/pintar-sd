import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireStudentProfileId } from "@/lib/session";
import { findClassByJoinCode } from "@/lib/studentAccount";

export async function POST(req: NextRequest) {
  const session = await auth();
  const studentId = requireStudentProfileId(session);
  if (!studentId) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHENTICATED", message: "Silakan masuk sebagai siswa." } },
      { status: 401 }
    );
  }

  const body = await req.json();
  const classroom = await findClassByJoinCode(typeof body.joinCode === "string" ? body.joinCode : "");
  if (!classroom) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Kode kelas tidak ditemukan." } },
      { status: 404 }
    );
  }

  const updated = await prisma.studentProfile.update({
    where: { id: studentId },
    data: { classId: classroom.id, grade: classroom.grade },
    select: { id: true, classId: true },
  });

  return NextResponse.json({
    success: true,
    data: { ...updated, className: classroom.name, joinCode: classroom.joinCode },
  });
}
