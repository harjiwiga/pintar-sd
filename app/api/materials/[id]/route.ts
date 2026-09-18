import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteUserMaterial } from "@/lib/materialProcessor";
import { requireUserId } from "@/lib/session";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const userId = requireUserId(session);
  if (!userId) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHENTICATED", message: "Silakan login." } },
      { status: 401 }
    );
  }

  const { id } = await params;
  const material = await prisma.userMaterial.findFirst({
    where: {
      id,
      OR: [{ status: "READY" }, { uploadedById: userId }],
    },
    include: {
      _count: { select: { chunks: true } },
      uploadedBy: { select: { id: true, name: true, role: true } },
    },
  });

  if (!material) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Dokumen tidak ditemukan." } },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      id: material.id,
      fileName: material.fileName,
      mimeType: material.mimeType,
      subject: material.subject,
      grade: material.grade,
      status: material.status,
      createdAt: material.createdAt,
      chunkCount: material._count.chunks,
      excerpt: material.extractedText?.slice(0, 400) ?? null,
      isOwner: material.uploadedById === userId,
      uploadedByName: material.uploadedBy.name,
      uploadedByRole:
        material.uploadedBy.role === "TEACHER"
          ? "Guru"
          : material.uploadedBy.role === "PARENT"
            ? "Orang tua"
            : material.uploadedBy.role,
    },
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const userId = requireUserId(session);
  if (!userId) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHENTICATED", message: "Silakan login." } },
      { status: 401 }
    );
  }

  const { id } = await params;
  const deleted = await deleteUserMaterial(id, userId);
  if (!deleted) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "Hanya pengunggah yang dapat menghapus dokumen ini dari pustaka bersama.",
        },
      },
      { status: 403 }
    );
  }

  return NextResponse.json({ success: true, data: { id } });
}
