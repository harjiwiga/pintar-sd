import { sanitizeExtractedText } from "@/lib/materialText";

/**
 * OCR gambar (foto buku, LKS, papan tulis) via Tesseract.
 * DeepSeek chat-only, jadi Vision API tidak dipakai sebagai default.
 */
export async function extractTextFromImage(buffer: Buffer): Promise<string> {
  const worker = await createOcrWorker();
  try {
    const result = await worker.recognize(buffer);
    return sanitizeExtractedText(result.data.text ?? "");
  } finally {
    await worker.terminate();
  }
}

const HANDWRITING_CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜÝàáâãäåæçèéêëìíîïñòóôõöùúûüýÿ" +
  "0123456789 .,;:?!()\"'-/%+=";

export async function extractHandwritingText(
  buffer: Buffer,
  options: { singleLine?: boolean } = {}
): Promise<string> {
  const Tesseract = await import("tesseract.js");
  const worker = await createOcrWorker();

  const modes = options.singleLine
    ? [Tesseract.PSM.SINGLE_LINE, Tesseract.PSM.RAW_LINE, Tesseract.PSM.SINGLE_WORD]
    : [Tesseract.PSM.SINGLE_BLOCK, Tesseract.PSM.SINGLE_LINE, Tesseract.PSM.SPARSE_TEXT];

  try {
    let best = { text: "", confidence: -1 };
    for (const mode of modes) {
      await worker.setParameters({
        tessedit_pageseg_mode: mode,
        tessedit_char_whitelist: HANDWRITING_CHARS,
        preserve_interword_spaces: "1",
        user_defined_dpi: "300",
      });
      const result = await worker.recognize(buffer);
      const text = sanitizeExtractedText(result.data.text ?? "");
      const confidence = result.data.confidence ?? 0;
      if (text && confidence > best.confidence) {
        best = { text, confidence };
      }
    }
    return best.text;
  } finally {
    await worker.terminate();
  }
}

async function createOcrWorker() {
  const { createWorker } = await import("tesseract.js");
  try {
    return await createWorker("eng");
  } catch {
    return await createWorker("ind+eng");
  }
}
