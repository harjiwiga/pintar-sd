import fs from "fs/promises";
import path from "path";

const UPLOAD_ROOT = path.join(process.cwd(), "uploads");

const EXT_BY_MIME: Record<string, string> = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

export function extensionForMime(mimeType: string): string {
  return EXT_BY_MIME[mimeType] ?? "";
}

export function relativeUploadPath(userId: string, materialId: string, mimeType: string): string {
  return path.join("uploads", userId, `${materialId}${extensionForMime(mimeType)}`);
}

export async function saveUpload(params: {
  userId: string;
  materialId: string;
  mimeType: string;
  buffer: Buffer;
}): Promise<string> {
  const relative = relativeUploadPath(params.userId, params.materialId, params.mimeType);
  const absolute = path.join(process.cwd(), relative);
  await fs.mkdir(path.dirname(absolute), { recursive: true });
  await fs.writeFile(absolute, params.buffer);
  return relative;
}

export async function deleteUpload(fileUrl: string): Promise<void> {
  if (!fileUrl) return;
  const absolute = path.isAbsolute(fileUrl) ? fileUrl : path.join(process.cwd(), fileUrl);
  if (!absolute.startsWith(UPLOAD_ROOT)) return;
  try {
    await fs.unlink(absolute);
  } catch {
    // File mungkin sudah tidak ada
  }
}

export async function readUpload(fileUrl: string): Promise<Buffer> {
  const absolute = path.isAbsolute(fileUrl) ? fileUrl : path.join(process.cwd(), fileUrl);
  return fs.readFile(absolute);
}
