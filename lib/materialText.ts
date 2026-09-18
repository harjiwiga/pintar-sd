export function sanitizeExtractedText(text: string): string {
  return text
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

export const ALLOWED_MATERIAL_MIMES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type AllowedMaterialMime = (typeof ALLOWED_MATERIAL_MIMES)[number];

export function detectMimeFromMagic(buffer: Buffer, declaredMime: string): AllowedMaterialMime | null {
  if (buffer.length >= 5 && buffer.subarray(0, 5).toString("ascii") === "%PDF-") {
    return "application/pdf";
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return "image/png";
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }

  return ALLOWED_MATERIAL_MIMES.includes(declaredMime as AllowedMaterialMime)
    ? (declaredMime as AllowedMaterialMime)
    : null;
}

const DEFAULT_MAX_UPLOAD_MB = 20;

export function maxUploadMb(): number {
  const mb = parseInt(process.env.MAX_UPLOAD_SIZE_MB ?? String(DEFAULT_MAX_UPLOAD_MB), 10);
  return Number.isFinite(mb) && mb > 0 ? mb : DEFAULT_MAX_UPLOAD_MB;
}

export function maxUploadBytes(): number {
  return maxUploadMb() * 1024 * 1024;
}
