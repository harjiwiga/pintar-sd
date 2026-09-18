import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { extractHandwritingText } from "@/lib/ocrExtractor";
import { decodeImageDataUrl } from "@/lib/handwriting";
import { transcribeHandwritingVision, visionConfig } from "@/lib/handwritingVision";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHENTICATED", message: "Silakan login." } }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const image = typeof body?.image === "string" ? body.image : "";
  const decoded = decodeImageDataUrl(image);
  if (!decoded) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "Gambar tulisan tidak valid." } },
      { status: 400 }
    );
  }

  const singleLine = body?.singleLine === true;

  try {
    if (visionConfig()) {
      try {
        const visionText = await transcribeHandwritingVision(decoded.buffer, decoded.mime, { singleLine });
        if (visionText !== null) {
          return NextResponse.json({ success: true, data: { text: visionText, source: "vision" } });
        }
      } catch (visionErr) {
        const message = visionErr instanceof Error ? visionErr.message : "Vision OCR gagal.";
        console.error("[ocr/handwriting] vision failed:", message);
        // lanjut fallback Tesseract
      }
    }

    const text = await extractHandwritingText(decoded.buffer, { singleLine });
    return NextResponse.json({ success: true, data: { text, source: "tesseract" } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal membaca tulisan tangan.";
    console.error("[ocr/handwriting]", message);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Gagal membaca tulisan tangan." } },
      { status: 500 }
    );
  }
}
