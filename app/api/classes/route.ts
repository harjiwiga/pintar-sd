import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { uniqueJoinCode } from "@/lib/studentAccount";

const CreateClassSchema = z.object({
  name: z.string().min(2).max(100),
  grade: z.number().int().min(1).max(6),
});

// GET /api/classes — daftar kelas milik guru yang login
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHENTICATED", message: "Silakan login terlebih dahulu." } },
      { status: 401 }
    );
  }

  const classes = await prisma.classRoom.findMany({
    where: { teacherId: session.user.id },
    include: { _count: { select: { students: true, assignments: true } } },
    orderBy: [{ grade: "asc" }, { name: "asc" }],
  });

  return NextResponse.json({ success: true, data: classes });
}

// POST /api/classes — guru membuat kelas baru
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHENTICATED", message: "Silakan login terlebih dahulu." } },
      { status: 401 }
    );
  }

  if (session.user.role !== "TEACHER" && session.user.role !== "ADMIN") {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "Hanya guru yang dapat membuat kelas." } },
      { status: 403 }
    );
  }

  const body = await req.json();
  const parsed = CreateClassSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "Input tidak valid.", details: parsed.error.flatten() } },
      { status: 400 }
    );
  }

  const classroom = await prisma.classRoom.create({
    data: { ...parsed.data, teacherId: session.user.id, joinCode: await uniqueJoinCode() },
  });

  return NextResponse.json({ success: true, data: classroom }, { status: 201 });
}
