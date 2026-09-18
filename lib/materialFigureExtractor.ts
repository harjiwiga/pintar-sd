import fs from "fs/promises";
import path from "path";
import sharp from "sharp";
import { prisma } from "@/lib/prisma";

const MAX_PAGES = 12;
const MAX_FIGURES_TOTAL = 24;
const MAX_FIGURES_PER_PAGE = 3;
const RENDER_SCALE = 1.25;
const MIN_AREA_RATIO = 0.035;
const MAX_AREA_RATIO = 0.72;

export type FigureBBox = { x: number; y: number; width: number; height: number };

export type ExtractedFigureCandidate = {
  pageNumber: number;
  bbox: FigureBBox;
  buffer: Buffer;
  width: number;
  height: number;
  nearbyText: string;
  areaRatio: number;
};

function figureRelativePath(userId: string, materialId: string, figureKey: string): string {
  return path.join("uploads", userId, materialId, "figures", `${figureKey}.webp`);
}

async function saveFigureFile(relative: string, buffer: Buffer): Promise<void> {
  const absolute = path.join(process.cwd(), relative);
  await fs.mkdir(path.dirname(absolute), { recursive: true });
  await fs.writeFile(absolute, buffer);
}

async function deleteFigureDir(userId: string, materialId: string): Promise<void> {
  const dir = path.join(process.cwd(), "uploads", userId, materialId, "figures");
  await fs.rm(dir, { recursive: true, force: true }).catch(() => undefined);
}

function rgbToRgba(rgb: Uint8Array | Buffer, width: number, height: number): Buffer {
  const rgba = Buffer.alloc(width * height * 4);
  for (let i = 0, j = 0; i < rgb.length; i += 3, j += 4) {
    rgba[j] = rgb[i];
    rgba[j + 1] = rgb[i + 1];
    rgba[j + 2] = rgb[i + 2];
    rgba[j + 3] = 255;
  }
  return rgba;
}

/**
 * Deteksi region gambar dari halaman yang sudah di-render (Level 2).
 * Pendekatan: downsample → baris putih membagi blok → skor kepadatan tinta.
 */
export function detectRegionsFromRgba(
  data: Uint8ClampedArray | Buffer,
  width: number,
  height: number
): FigureBBox[] {
  const step = Math.max(2, Math.floor(Math.min(width, height) / 220));
  const cols = Math.ceil(width / step);
  const rows = Math.ceil(height / step);
  const ink = new Float32Array(rows * cols);

  for (let gy = 0; gy < rows; gy++) {
    for (let gx = 0; gx < cols; gx++) {
      let dark = 0;
      let count = 0;
      const y0 = gy * step;
      const x0 = gx * step;
      const y1 = Math.min(height, y0 + step);
      const x1 = Math.min(width, x0 + step);
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const i = (y * width + x) * 4;
          const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          if (lum < 235) dark += 1;
          count += 1;
        }
      }
      ink[gy * cols + gx] = count ? dark / count : 0;
    }
  }

  const rowInk = new Float32Array(rows);
  for (let gy = 0; gy < rows; gy++) {
    let sum = 0;
    for (let gx = 0; gx < cols; gx++) sum += ink[gy * cols + gx];
    rowInk[gy] = sum / cols;
  }

  const whiteRow = Array.from(rowInk, (v) => v < 0.045);
  type Band = { y0: number; y1: number };
  const bands: Band[] = [];
  let start: number | null = null;
  for (let gy = 0; gy < rows; gy++) {
    const content = !whiteRow[gy];
    if (content && start === null) start = gy;
    if ((!content || gy === rows - 1) && start !== null) {
      const end = content && gy === rows - 1 ? gy : gy - 1;
      if (end >= start) bands.push({ y0: start, y1: end });
      start = null;
    }
  }

  const boxes: Array<FigureBBox & { score: number }> = [];

  for (const band of bands) {
    const bandH = band.y1 - band.y0 + 1;
    if (bandH < 8) continue;

    const colInk = new Float32Array(cols);
    for (let gx = 0; gx < cols; gx++) {
      let sum = 0;
      for (let gy = band.y0; gy <= band.y1; gy++) sum += ink[gy * cols + gx];
      colInk[gx] = sum / bandH;
    }

    let c0 = 0;
    while (c0 < cols && colInk[c0] < 0.04) c0++;
    let c1 = cols - 1;
    while (c1 > c0 && colInk[c1] < 0.04) c1--;
    if (c1 - c0 < 8) continue;

    let inkSum = 0;
    let cellCount = 0;
    let edgeTransitions = 0;
    for (let gy = band.y0; gy <= band.y1; gy++) {
      for (let gx = c0; gx <= c1; gx++) {
        const v = ink[gy * cols + gx];
        inkSum += v;
        cellCount++;
        if (gx > c0) {
          const prev = ink[gy * cols + (gx - 1)];
          if (v > 0.15 !== prev > 0.15) edgeTransitions++;
        }
      }
    }
    const density = cellCount ? inkSum / cellCount : 0;
    const boxW = (c1 - c0 + 1) * step;
    const boxH = bandH * step;
    const areaRatio = (boxW * boxH) / (width * height);
    if (areaRatio < MIN_AREA_RATIO || areaRatio > MAX_AREA_RATIO) continue;
    if (density < 0.06 || density > 0.92) continue;

    const transitionRate = cellCount ? edgeTransitions / cellCount : 1;
    const aspect = boxW / Math.max(boxH, 1);
    if (aspect > 8 || aspect < 0.18) continue;

    const textLike = boxH < height * 0.08 && aspect > 4;
    if (textLike) continue;

    const score = density * (1 - Math.min(1, transitionRate * 1.8)) * Math.min(areaRatio * 8, 1.5);
    if (score < 0.02) continue;

    const pad = Math.round(step * 1.5);
    boxes.push({
      x: Math.max(0, c0 * step - pad),
      y: Math.max(0, band.y0 * step - pad),
      width: Math.min(width - Math.max(0, c0 * step - pad), boxW + pad * 2),
      height: Math.min(height - Math.max(0, band.y0 * step - pad), boxH + pad * 2),
      score,
    });
  }

  boxes.sort((a, b) => b.score - a.score);

  const picked: FigureBBox[] = [];
  for (const box of boxes) {
    const overlap = picked.some((p) => iou(p, box) > 0.45);
    if (!overlap) picked.push({ x: box.x, y: box.y, width: box.width, height: box.height });
    if (picked.length >= MAX_FIGURES_PER_PAGE) break;
  }
  return picked;
}

function iou(a: FigureBBox, b: FigureBBox): number {
  const x0 = Math.max(a.x, b.x);
  const y0 = Math.max(a.y, b.y);
  const x1 = Math.min(a.x + a.width, b.x + b.width);
  const y1 = Math.min(a.y + a.height, b.y + b.height);
  const w = Math.max(0, x1 - x0);
  const h = Math.max(0, y1 - y0);
  const inter = w * h;
  const union = a.width * a.height + b.width * b.height - inter;
  return union > 0 ? inter / union : 0;
}

async function cropToWebp(
  rgba: Buffer,
  pageWidth: number,
  pageHeight: number,
  bbox: FigureBBox
): Promise<{ buffer: Buffer; width: number; height: number }> {
  const left = Math.max(0, Math.floor(bbox.x));
  const top = Math.max(0, Math.floor(bbox.y));
  const width = Math.max(1, Math.min(pageWidth - left, Math.floor(bbox.width)));
  const height = Math.max(1, Math.min(pageHeight - top, Math.floor(bbox.height)));

  const buffer = await sharp(rgba, { raw: { width: pageWidth, height: pageHeight, channels: 4 } })
    .extract({ left, top, width, height })
    .webp({ quality: 78 })
    .toBuffer();

  const meta = await sharp(buffer).metadata();
  return { buffer, width: meta.width ?? width, height: meta.height ?? height };
}

async function extractFromImageBuffer(buffer: Buffer): Promise<ExtractedFigureCandidate[]> {
  const image = sharp(buffer).rotate();
  const { data, info } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const regions = detectRegionsFromRgba(data, info.width, info.height);

  const candidates: ExtractedFigureCandidate[] = [];
  const boxes =
    regions.length > 0
      ? regions
      : [
          {
            x: Math.floor(info.width * 0.02),
            y: Math.floor(info.height * 0.02),
            width: Math.floor(info.width * 0.96),
            height: Math.floor(info.height * 0.96),
          },
        ];

  for (const bbox of boxes.slice(0, MAX_FIGURES_PER_PAGE)) {
    const cropped = await cropToWebp(data, info.width, info.height, bbox);
    candidates.push({
      pageNumber: 1,
      bbox,
      buffer: cropped.buffer,
      width: cropped.width,
      height: cropped.height,
      nearbyText: "",
      areaRatio: (bbox.width * bbox.height) / (info.width * info.height),
    });
  }
  return candidates;
}

async function extractFromPdfBuffer(buffer: Buffer): Promise<ExtractedFigureCandidate[]> {
  const mupdf = await import("mupdf");
  const doc = mupdf.Document.openDocument(buffer, "application/pdf");
  const pageCount = Math.min(doc.countPages(), MAX_PAGES);
  const candidates: ExtractedFigureCandidate[] = [];
  const matrix = mupdf.Matrix.scale(RENDER_SCALE, RENDER_SCALE);

  for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
    if (candidates.length >= MAX_FIGURES_TOTAL) break;
    const page = doc.loadPage(pageIndex);
    const pixmap = page.toPixmap(matrix, mupdf.ColorSpace.DeviceRGB, false, true);
    const width = pixmap.getWidth();
    const height = pixmap.getHeight();
    const rgb = Buffer.from(pixmap.getPixels());
    const rgba = rgbToRgba(rgb, width, height);
    const regions = detectRegionsFromRgba(rgba, width, height);

    let textNearby = "";
    try {
      textNearby = page.toStructuredText("preserve-spans").asText().slice(0, 400);
    } catch {
      textNearby = "";
    }

    for (const bbox of regions) {
      if (candidates.length >= MAX_FIGURES_TOTAL) break;
      const cropped = await cropToWebp(rgba, width, height, bbox);
      if (cropped.width < 64 || cropped.height < 64) continue;
      candidates.push({
        pageNumber: pageIndex + 1,
        bbox,
        buffer: cropped.buffer,
        width: cropped.width,
        height: cropped.height,
        nearbyText: textNearby,
        areaRatio: (bbox.width * bbox.height) / (width * height),
      });
    }
  }

  return candidates;
}

export async function extractFigureCandidates(
  buffer: Buffer,
  mimeType: string
): Promise<ExtractedFigureCandidate[]> {
  if (mimeType === "application/pdf") {
    return extractFromPdfBuffer(buffer);
  }
  if (mimeType.startsWith("image/")) {
    return extractFromImageBuffer(buffer);
  }
  return [];
}

export async function persistMaterialFigures(params: {
  materialId: string;
  userId: string;
  mimeType: string;
  buffer: Buffer;
}): Promise<number> {
  const existing = await prisma.materialFigure.findMany({
    where: { materialId: params.materialId },
    select: { id: true, fileUrl: true },
  });
  for (const fig of existing) {
    const absolute = path.join(process.cwd(), fig.fileUrl);
    await fs.unlink(absolute).catch(() => undefined);
  }
  if (existing.length) {
    await prisma.materialFigure.deleteMany({ where: { materialId: params.materialId } });
  }
  await deleteFigureDir(params.userId, params.materialId);

  let candidates: ExtractedFigureCandidate[] = [];
  try {
    candidates = await extractFigureCandidates(params.buffer, params.mimeType);
  } catch (err) {
    console.error("[materialFigureExtractor] extract failed", err);
    return 0;
  }

  let saved = 0;
  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];
    const key = `p${c.pageNumber}_${String(i + 1).padStart(2, "0")}`;
    const fileUrl = figureRelativePath(params.userId, params.materialId, key);
    await saveFigureFile(fileUrl, c.buffer);
    await prisma.materialFigure.create({
      data: {
        materialId: params.materialId,
        pageNumber: c.pageNumber,
        bboxJson: c.bbox,
        fileUrl,
        width: c.width,
        height: c.height,
        nearbyText: c.nearbyText || null,
        areaRatio: c.areaRatio,
      },
    });
    saved += 1;
  }
  return saved;
}

export async function ensureMaterialFigures(materialId: string): Promise<number> {
  const material = await prisma.userMaterial.findUnique({
    where: { id: materialId },
    include: { _count: { select: { figures: true } } },
  });
  if (!material || material.status !== "READY" || !material.fileUrl) return 0;
  if (material._count.figures > 0) return material._count.figures;

  const absolute = path.isAbsolute(material.fileUrl)
    ? material.fileUrl
    : path.join(process.cwd(), material.fileUrl);
  const buffer = await fs.readFile(absolute);
  return persistMaterialFigures({
    materialId: material.id,
    userId: material.uploadedById,
    mimeType: material.mimeType,
    buffer,
  });
}

export function scoreFigureRelevance(prompt: string, nearbyText: string | null | undefined): number {
  const tokens = tokenize(prompt);
  if (!tokens.length) return 0;
  const hay = tokenize(nearbyText ?? "");
  if (!hay.length) return 0.05;
  const haySet = new Set(hay);
  let hit = 0;
  for (const t of tokens) if (haySet.has(t)) hit += 1;
  return hit / tokens.length;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\u00c0-\u024f\u1e00-\u1eff\s]/gi, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3);
}
