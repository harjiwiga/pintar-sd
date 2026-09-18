import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { chunkText } from "@/lib/textChunker";
import { detectMimeFromMagic, maxUploadBytes, maxUploadMb, sanitizeExtractedText } from "@/lib/materialText";
import { deleteUpload, readUpload, saveUpload } from "@/lib/storageClient";

export function hashMaterialBuffer(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

export async function extractTextFromBuffer(buffer: Buffer, mimeType: string): Promise<string> {
  if (mimeType === "application/pdf") {
    const mod = await import("pdf-parse");
    const pdfParse = (mod as { default?: (buf: Buffer) => Promise<{ text?: string }> }).default ??
      (mod as unknown as (buf: Buffer) => Promise<{ text?: string }>);
    const parsed = await pdfParse(buffer);
    return sanitizeExtractedText(parsed.text ?? "");
  }

  if (mimeType.startsWith("image/")) {
    const { extractTextFromImage } = await import("@/lib/ocrExtractor");
    return extractTextFromImage(buffer);
  }

  throw new Error("Tipe file tidak didukung. Unggah PDF, JPG, PNG, atau WEBP.");
}

export type ProcessMaterialResult = Awaited<ReturnType<typeof loadMaterialWithCount>> & {
  reused?: boolean;
};

async function loadMaterialWithCount(id: string) {
  return prisma.userMaterial.findUniqueOrThrow({
    where: { id },
    include: {
      _count: { select: { chunks: true } },
      uploadedBy: { select: { id: true, name: true, role: true } },
    },
  });
}

async function ensureContentHash(materialId: string, fileUrl: string): Promise<string | null> {
  if (!fileUrl) return null;
  try {
    const buffer = await readUpload(fileUrl);
    const contentHash = hashMaterialBuffer(buffer);
    try {
      await prisma.userMaterial.update({
        where: { id: materialId },
        data: { contentHash },
      });
      return contentHash;
    } catch {
      // Unique conflict: hash sudah dimiliki dokumen lain → tetap kembalikan hash untuk pencocokan
      return contentHash;
    }
  } catch {
    return null;
  }
}

/**
 * Cari dokumen dengan isi sama: hash langsung, lalu dokumen lama tanpa hash (dihitung on-the-fly).
 */
export async function findMaterialByContentHash(contentHash: string, fileName?: string) {
  const include = {
    _count: { select: { chunks: true } },
    uploadedBy: { select: { id: true, name: true, role: true } },
  } as const;

  const byHash = await prisma.userMaterial.findUnique({
    where: { contentHash },
    include,
  });
  if (byHash) return byHash;

  // Prioritas: nama file sama dulu (lebih cepat), lalu sisa dokumen tanpa hash
  const legacy = await prisma.userMaterial.findMany({
    where: {
      contentHash: null,
      ...(fileName
        ? {
            OR: [
              { fileName: { equals: fileName, mode: "insensitive" } },
              { fileName: { contains: fileName.replace(/\.[^.]+$/, ""), mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include,
    orderBy: { createdAt: "asc" },
    take: fileName ? 30 : 100,
  });

  // Jika filter nama tidak menemukan, cek semua legacy READY
  const candidates =
    legacy.length > 0
      ? legacy
      : await prisma.userMaterial.findMany({
          where: { contentHash: null, status: "READY" },
          include,
          orderBy: { createdAt: "asc" },
          take: 100,
        });

  for (const item of candidates) {
    const hash = await ensureContentHash(item.id, item.fileUrl);
    if (hash === contentHash) {
      return loadMaterialWithCount(item.id);
    }
  }

  // Hash mungkin baru diisi ke record lain saat loop → cek ulang
  return prisma.userMaterial.findUnique({
    where: { contentHash },
    include,
  });
}

export async function processMaterialFile(params: {
  userId: string;
  fileName: string;
  declaredMime: string;
  buffer: Buffer;
  subject?: string;
  grade?: number;
}): Promise<ProcessMaterialResult> {
  if (params.buffer.length > maxUploadBytes()) {
    throw new Error(`Ukuran file melebihi ${maxUploadMb()} MB.`);
  }

  const mimeType = detectMimeFromMagic(params.buffer, params.declaredMime);
  if (!mimeType) {
    throw new Error("File tidak valid. Hanya PDF, JPG, PNG, atau WEBP yang diterima.");
  }

  const contentHash = hashMaterialBuffer(params.buffer);
  const existing = await findMaterialByContentHash(contentHash, params.fileName);

  if (existing) {
    if (existing.status === "READY") {
      return { ...existing, reused: true };
    }
    if (existing.status === "PROCESSING") {
      throw new Error(
        "Dokumen dengan isi yang sama sedang diproses. Tunggu sebentar, lalu pilih dari pustaka bersama."
      );
    }
    return reprocessFailedMaterial({
      materialId: existing.id,
      userId: params.userId,
      fileName: params.fileName,
      mimeType,
      buffer: params.buffer,
      contentHash,
      subject: params.subject,
      grade: params.grade,
    });
  }

  try {
    const material = await prisma.userMaterial.create({
      data: {
        uploadedById: params.userId,
        fileName: params.fileName.slice(0, 180),
        fileUrl: "",
        mimeType,
        contentHash,
        subject: params.subject || null,
        grade: params.grade ?? null,
        status: "PROCESSING",
      },
    });

    try {
      await finalizeMaterialProcessing({
        materialId: material.id,
        userId: params.userId,
        mimeType,
        buffer: params.buffer,
      });
      return { ...(await loadMaterialWithCount(material.id)), reused: false };
    } catch (err) {
      await prisma.userMaterial.update({
        where: { id: material.id },
        data: { status: "FAILED" },
      });
      throw err;
    }
  } catch (err) {
    // Race: user lain baru saja menyimpan hash yang sama
    const raced = await prisma.userMaterial.findUnique({
      where: { contentHash },
      include: {
        _count: { select: { chunks: true } },
        uploadedBy: { select: { id: true, name: true, role: true } },
      },
    });
    if (raced?.status === "READY") {
      return { ...raced, reused: true };
    }
    throw err;
  }
}

async function reprocessFailedMaterial(params: {
  materialId: string;
  userId: string;
  fileName: string;
  mimeType: string;
  buffer: Buffer;
  contentHash: string;
  subject?: string;
  grade?: number;
}): Promise<ProcessMaterialResult> {
  await prisma.materialChunk.deleteMany({ where: { materialId: params.materialId } });
  await prisma.materialFigure.deleteMany({ where: { materialId: params.materialId } });
  await prisma.userMaterial.update({
    where: { id: params.materialId },
    data: {
      uploadedById: params.userId,
      fileName: params.fileName.slice(0, 180),
      mimeType: params.mimeType,
      contentHash: params.contentHash,
      subject: params.subject || null,
      grade: params.grade ?? null,
      status: "PROCESSING",
      extractedText: null,
      fileUrl: "",
    },
  });

  try {
    await finalizeMaterialProcessing({
      materialId: params.materialId,
      userId: params.userId,
      mimeType: params.mimeType,
      buffer: params.buffer,
    });
    return { ...(await loadMaterialWithCount(params.materialId)), reused: false };
  } catch (err) {
    await prisma.userMaterial.update({
      where: { id: params.materialId },
      data: { status: "FAILED" },
    });
    throw err;
  }
}

async function finalizeMaterialProcessing(params: {
  materialId: string;
  userId: string;
  mimeType: string;
  buffer: Buffer;
}) {
  const fileUrl = await saveUpload({
    userId: params.userId,
    materialId: params.materialId,
    mimeType: params.mimeType,
    buffer: params.buffer,
  });

  const extractedText = await extractTextFromBuffer(params.buffer, params.mimeType);
  if (extractedText.length < 20) {
    throw new Error(
      "Teks pada dokumen terlalu sedikit. Unggah PDF yang berisi teks, atau foto yang lebih jelas."
    );
  }

  const chunks = chunkText(extractedText);
  await prisma.userMaterial.update({
    where: { id: params.materialId },
    data: {
      fileUrl,
      extractedText,
      status: "READY",
      chunks: {
        create: chunks.map((content, chunkIndex) => ({ chunkIndex, content })),
      },
    },
  });

  // Level 2: render halaman + crop region (non-blocking untuk status READY)
  try {
    const { persistMaterialFigures } = await import("@/lib/materialFigureExtractor");
    await persistMaterialFigures({
      materialId: params.materialId,
      userId: params.userId,
      mimeType: params.mimeType,
      buffer: params.buffer,
    });
  } catch (err) {
    console.error("[materialProcessor] figure extract failed", err);
  }
}

export async function deleteUserMaterial(materialId: string, userId: string): Promise<boolean> {
  const material = await prisma.userMaterial.findFirst({
    where: { id: materialId, uploadedById: userId },
    include: { figures: { select: { fileUrl: true } } },
  });
  if (!material) return false;

  for (const fig of material.figures) {
    await deleteUpload(fig.fileUrl);
  }
  await deleteUpload(material.fileUrl);
  // Hapus folder figures jika ada
  try {
    const fs = await import("fs/promises");
    const path = await import("path");
    await fs.rm(path.join(process.cwd(), "uploads", userId, materialId), {
      recursive: true,
      force: true,
    });
  } catch {
    // ignore
  }
  await prisma.userMaterial.delete({ where: { id: materialId } });
  return true;
}
