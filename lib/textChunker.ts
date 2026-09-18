/**
 * Memecah teks dokumen menjadi potongan untuk konteks generate soal.
 */
export function chunkText(
  text: string,
  chunkSize = 900,
  overlap = 120
): string[] {
  const normalized = text.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").trim();
  if (!normalized) return [];

  const chunks: string[] = [];
  let start = 0;
  while (start < normalized.length) {
    const end = Math.min(start + chunkSize, normalized.length);
    const slice = normalized.slice(start, end).trim();
    if (slice) chunks.push(slice);
    if (end >= normalized.length) break;
    start = end - overlap;
  }
  return chunks;
}

export function truncateContext(text: string, maxChars = 8000): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxChars) return trimmed;
  return `${trimmed.slice(0, maxChars)}\n\n[...materi dipotong agar muat di prompt]`;
}

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[.,!?;:]+$/, "");
}

export function significantWords(text: string): string[] {
  return normalizeText(text)
    .replace(/[^a-z0-9à-ÿ\s]/gi, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 4);
}
