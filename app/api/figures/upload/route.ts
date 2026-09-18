import { randomBytes } from "crypto";
import fs from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { detectMimeFromMagic, maxUploadBytes, maxUploadMb } from "@/lib/materialText";
import { requireUserId } from "@/lib/session";

const MANUAL_MATERIAL_NAME = "Unggahan gambar soal";

async function getOrCreateManualMaterial(userId: string) {
  const existing = await prisma.userMaterial.findFirst({
    where: {
      uploadedById: userId,
      fileName: MANUAL_MATERIAL_NAME,
      status: "READY",
    },
    orderBy: { createdAt: "asc" },
  });
  if (existing) return existing;

  return prisma.userMaterial.create({
    data: {
      uploadedById: userId,
      fileName: MANUAL_MATERIAL_NAME,
      fileUrl: "",
      mimeType: "image/webp",
      extractedText: "Koleksi gambar yang diunggah langsung ke soal.",
      status: "READY",
    },
  });
}

// POST /api/figures/upload — unggah gambar manual untuk disematkan ke soal
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
  const materialIdRaw = form.get("materialId");
  const materialId = typeof materialIdRaw === "string" && materialIdRaw.trim() ? materialIdRaw.trim() : null;

  if (!(file instanceof File)) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "File gambar wajib diunggah." } },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length > maxUploadBytes()) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "VALIDATION_ERROR", message: `Ukuran file melebihi ${maxUploadMb()} MB.` },
      },
      { status: 400 }
    );
  }

  const mimeType = detectMimeFromMagic(buffer, file.type || "application/octet-stream");
  if (!mimeType || !mimeType.startsWith("image/")) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Hanya JPG, PNG, atau WEBP yang diterima." },
      },
      { status: 400 }
    );
  }

  let material =
    materialId
      ? await prisma.userMaterial.findFirst({
          where: {
            id: materialId,
            OR: [{ status: "READY" }, { uploadedById: userId }],
          },
        })
      : null;

  if (materialId && !material) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Dokumen referensi tidak ditemukan." } },
      { status: 404 }
    );
  }

  if (!material) {
    material = await getOrCreateManualMaterial(userId);
  }

  const ownerId = material.uploadedById || userId;
  const key = `upload_${Date.now()}_${randomBytes(3).toString("hex")}`;
  const relative = path.join("uploads", ownerId, material.id, "figures", `${key}.webp`);
  const absolute = path.join(process.cwd(), relative);

  const webp = await sharp(buffer).rotate().webp({ quality: 82 }).toBuffer();
  const meta = await sharp(webp).metadata();
  const width = meta.width ?? 1;
  const height = meta.height ?? 1;

  await fs.mkdir(path.dirname(absolute), { recursive: true });
  await fs.writeFile(absolute, webp);

  const figure = await prisma.materialFigure.create({
    data: {
      materialId: material.id,
      pageNumber: 0,
      bboxJson: { x: 0, y: 0, width, height },
      fileUrl: relative,
      width,
      height,
      nearbyText: file.name?.slice(0, 120) || "Unggahan manual",
      areaRatio: 1,
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      id: figure.id,
      pageNumber: figure.pageNumber,
      width: figure.width,
      height: figure.height,
      nearbyText: figure.nearbyText,
      areaRatio: figure.areaRatio,
      url: `/api/figures/${figure.id}`,
      relevance: 1,
      source: "upload",
    },
  });
}
