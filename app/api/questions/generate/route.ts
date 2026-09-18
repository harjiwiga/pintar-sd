import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateQuestions } from "@/lib/questionGenerator";
import { GenerateQuestionsSchema } from "@/lib/validations/question";
import { requireUserId } from "@/lib/session";

// POST /api/questions/generate
export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = requireUserId(session);
  if (!userId) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHENTICATED", message: "Silakan login terlebih dahulu." } },
      { status: 401 }
    );
  }

  const body = await req.json();
  const parsed = GenerateQuestionsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "Parameter tidak valid.", details: parsed.error.flatten() } },
      { status: 400 }
    );
  }

  try {
    const drafts = await generateQuestions(parsed.data, userId);
    return NextResponse.json({ success: true, data: drafts });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Terjadi kesalahan.";
    if (message === "MATERIAL_NOT_READY") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "Dokumen belum siap atau tidak ditemukan. Unggah ulang, lalu pilih yang berstatus Siap.",
          },
        },
        { status: 404 }
      );
    }
    if (message === "LLM_UNAVAILABLE") {
      return NextResponse.json(
        { success: false, error: { code: "LLM_UNAVAILABLE", message: "Layanan AI tidak tersedia saat ini. Coba lagi nanti." } },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Gagal generate soal." } },
      { status: 500 }
    );
  }
}
