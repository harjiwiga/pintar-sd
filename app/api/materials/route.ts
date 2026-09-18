import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { processMaterialFile } from "@/lib/materialProcessor";
import { maxUploadBytes, maxUploadMb } from "@/lib/materialText";
import { requireUserId } from "@/lib/session";

export const runtime = "nodejs";
export const maxDuration = 60;

function roleLabel(role?: string | null) {
  if (role === "TEACHER") return "Guru";
  if (role === "PARENT") return "Orang tua";
  if (role === "ADMIN") return "Admin";
  return "Pengguna";
}

function mapMaterial(
  m: {
    id: string;
    fileName: string;
    mimeType: string;
    subject: string | null;
    grade: number | null;
    status: string;
    createdAt: Date;
    extractedText: string | null;
    uploadedById: string;
    uploadedBy?: { id: string; name: string; role: string } | null;
    _count: { chunks: number };
  },
  currentUserId: string
) {
  return {
    id: m.id,
    fileName: m.fileName,
    mimeType: m.mimeType,
    subject: m.subject,
    grade: m.grade,
    status: m.status,
    createdAt: m.createdAt,
    chunkCount: m._count.chunks,
    excerpt: m.extractedText?.slice(0, 180) ?? null,
    isOwner: m.uploadedById === currentUserId,
    uploadedByName: m.uploadedBy?.name ?? "Pengguna",
    uploadedByRole: roleLabel(m.uploadedBy?.role),
  };
}

export async function GET() {
  const session = await auth();
  const userId = requireUserId(session);
  if (!userId) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHENTICATED", message: "Silakan login." } },
      { status: 401 }
    );
  }

  // Pustaka bersama: semua dokumen READY + dokumen milik sendiri (meski masih proses/gagal)
  // Sembunyikan bucket internal untuk unggahan gambar soal manual
  const materials = await prisma.userMaterial.findMany({
    where: {
      AND: [
        { fileName: { not: "Unggahan gambar soal" } },
        { OR: [{ status: "READY" }, { uploadedById: userId }] },
      ],
    },
    include: {
      _count: { select: { chunks: true } },
      uploadedBy: { select: { id: true, name: true, role: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  // Satu entri per isi file (contentHash). Dokumen lama tanpa hash digabung per nama file.
  const deduped: typeof materials = [];
  const seenHash = new Set<string>();
  const seenName = new Set<string>();
  for (const m of materials) {
    if (m.contentHash) {
      if (seenHash.has(m.contentHash)) continue;
      seenHash.add(m.contentHash);
      deduped.push(m);
      continue;
    }
    const nameKey = m.fileName.trim().toLowerCase();
    if (m.status === "READY" && seenName.has(nameKey)) continue;
    if (m.status === "READY") seenName.add(nameKey);
    deduped.push(m);
  }

  deduped.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return NextResponse.json({
    success: true,
    data: deduped.map((m) => mapMaterial(m, userId)),
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = requireUserId(session);
  if (!userId) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHENTICATED", message: "Silakan login." } },
      { status: 401 }
    );
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "File wajib diunggah." } },
      { status: 400 }
    );
  }

  if (file.size > maxUploadBytes()) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: `Ukuran file melebihi ${maxUploadMb()} MB.`,
        },
      },
      { status: 400 }
    );
  }

  const subject = String(form.get("subject") ?? "").trim() || undefined;
  const gradeRaw = String(form.get("grade") ?? "").trim();
  const grade = gradeRaw ? Number(gradeRaw) : undefined;
  if (grade !== undefined && (Number.isNaN(grade) || grade < 1 || grade > 6)) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "Kelas harus 1 sampai 6." } },
      { status: 400 }
    );
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const material = await processMaterialFile({
      userId,
      fileName: file.name || "dokumen",
      declaredMime: file.type,
      buffer,
      subject,
      grade,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          ...mapMaterial(material, userId),
          reused: Boolean(material.reused),
          message: material.reused
            ? `Dokumen ini sudah ada di sistem (diunggah ${material.uploadedBy?.name ?? "pengguna lain"}). Tidak ada salinan baru — silakan pilih dari pustaka bersama.`
            : undefined,
        },
      },
      { status: material.reused ? 200 : 201 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal memproses dokumen.";
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message } },
      { status: 400 }
    );
  }
}
