import { z } from "zod";
import he from "he";
import { createLLMClient } from "@/lib/llmClient";
import { retrieveKurikulumContext, retrieveUserMaterialContext } from "@/lib/ragRetriever";
import { prisma } from "@/lib/prisma";
import { resolveComposition, weightForType } from "@/lib/questionComposition";
import type { DraftQuestion, GenerateQuestionType, GenerateQuestionsInput } from "@/types";
import type { QuestionType } from "@prisma/client";

const LLMQuestionSchema = z.object({
  type: z.enum(["MULTIPLE_CHOICE", "TRUE_FALSE", "SHORT_ANSWER", "ESSAY"]).optional(),
  topic: z.string().min(2).max(120).optional(),
  prompt: z.string().min(10).max(800),
  choices: z
    .array(
      z.object({
        key: z.enum(["A", "B", "C", "D"]),
        text: z.string().min(1),
      })
    )
    .length(4)
    .optional(),
  correctKey: z.string().optional(),
  correctText: z.string().optional(),
  explanation: z.string().min(10).max(2000),
});

const LLMResponseSchema = z.array(LLMQuestionSchema).min(1);

const QUESTION_TYPE_LABELS: Record<GenerateQuestionType, string> = {
  MULTIPLE_CHOICE: "pilihan ganda",
  TRUE_FALSE: "benar atau salah",
  SHORT_ANSWER: "isian singkat",
  ESSAY: "esai / uraian",
  MIXED: "campuran pilihan ganda dan esai",
};

const DIFFICULTY_LABELS: Record<string, string> = {
  EASY: "mudah (C1-C2)",
  MEDIUM: "sedang (C3)",
  HARD: "sulit (C4-C5)",
};

const SYSTEM_PROMPT = `Kamu adalah asisten pembuat soal latihan untuk siswa Sekolah Dasar (SD) di Indonesia.
Kamu membuat soal yang:
- Sesuai dengan Kurikulum Merdeka
- Menggunakan Bahasa Indonesia yang baik, jelas, dan sesuai usia siswa
- Akurat secara fakta dan konsep
- Merujuk pada materi dokumen jika konteks dokumen disediakan
- Memiliki tingkat kognitif yang sesuai dengan jenjang kelas (Bloom's Taxonomy: C1-C2 untuk EASY, C3 untuk MEDIUM, C4-C5 untuk HARD)
- TIDAK mengandung konten yang tidak pantas, SARA, atau menyesatkan

Kamu HANYA merespons dalam format JSON yang valid sesuai skema yang diminta.
Jangan tambahkan teks, penjelasan, atau markdown di luar JSON.`;

function sanitizeText(text: string): string {
  return he.escape(text.replace(/<[^>]*>/g, "").trim());
}

function sanitizeDraft(draft: DraftQuestion): DraftQuestion {
  return {
    ...draft,
    topic: draft.topic ? sanitizeText(draft.topic) : undefined,
    prompt: sanitizeText(draft.prompt),
    explanation: sanitizeText(draft.explanation),
    correctText: draft.correctText ? sanitizeText(draft.correctText) : undefined,
    weight: draft.weight,
    choices: draft.choices?.map((c) => ({
      ...c,
      text: sanitizeText(c.text),
    })),
  };
}

function inferType(
  item: z.infer<typeof LLMQuestionSchema>,
  requested: GenerateQuestionType
): QuestionType {
  if (item.type) return item.type;
  if (requested !== "MIXED") return requested;
  return item.choices?.length === 4 ? "MULTIPLE_CHOICE" : "ESSAY";
}

function isUsableDraft(draft: DraftQuestion): boolean {
  if (draft.type === "MULTIPLE_CHOICE") {
    return Boolean(draft.choices?.length === 4 && draft.correctKey);
  }
  if (draft.type === "TRUE_FALSE") {
    return Boolean(draft.correctKey);
  }
  return Boolean(draft.correctText && draft.correctText.length >= 4);
}

function schemaExample(questionType: GenerateQuestionType): string {
  if (questionType === "MULTIPLE_CHOICE") {
    return JSON.stringify(
      [
        {
          type: "MULTIPLE_CHOICE",
          topic: "Nama bab",
          prompt: "Contoh soal pilihan ganda...",
          choices: [
            { key: "A", text: "..." },
            { key: "B", text: "..." },
            { key: "C", text: "..." },
            { key: "D", text: "..." },
          ],
          correctKey: "A",
          explanation: "Penjelasan...",
        },
      ],
      null,
      2
    );
  }

  if (questionType === "TRUE_FALSE") {
    return JSON.stringify(
      [{ type: "TRUE_FALSE", topic: "Nama bab", prompt: "Pernyataan...", correctKey: "BENAR", explanation: "..." }],
      null,
      2
    );
  }

  if (questionType === "ESSAY") {
    return JSON.stringify(
      [
        {
          type: "ESSAY",
          topic: "Nama bab",
          prompt: "Jelaskan dengan kalimatmu sendiri...",
          correctText: "Poin jawaban yang diharapkan...",
          explanation: "Pembahasan untuk guru/orang tua...",
        },
      ],
      null,
      2
    );
  }

  if (questionType === "MIXED") {
    return JSON.stringify(
      [
        {
          type: "MULTIPLE_CHOICE",
          topic: "Nama bab",
          prompt: "Contoh soal pilihan ganda...",
          choices: [
            { key: "A", text: "..." },
            { key: "B", text: "..." },
            { key: "C", text: "..." },
            { key: "D", text: "..." },
          ],
          correctKey: "B",
          explanation: "Penjelasan...",
        },
        {
          type: "ESSAY",
          topic: "Nama bab",
          prompt: "Contoh soal uraian...",
          correctText: "Poin jawaban yang diharapkan...",
          explanation: "Pembahasan...",
        },
      ],
      null,
      2
    );
  }

  return JSON.stringify(
    [
      {
        type: "SHORT_ANSWER",
        topic: "Nama bab",
        prompt: "Soal isian...",
        correctText: "jawaban",
        explanation: "...",
      },
    ],
    null,
    2
  );
}

async function getFallbackQuestions(input: GenerateQuestionsInput): Promise<DraftQuestion[]> {
  try {
    const subjectSlug = input.subject.toLowerCase().replace(/\s+/g, "-");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const templates = require(
      `@/lib/questionTemplates/${subjectSlug}-kelas-${input.grade}.json`
    ) as DraftQuestion[];
    const shuffled = templates.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, input.count);
  } catch {
    return [];
  }
}

function extractJSON(text: string): unknown {
  try {
    const parsed = JSON.parse(text);
    return unwrapQuestions(parsed);
  } catch {
    const match = text.match(/\[[\s\S]*\]/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

function unwrapQuestions(parsed: unknown): unknown {
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === "object") {
    const record = parsed as Record<string, unknown>;
    for (const key of ["questions", "data", "soal", "items"]) {
      if (Array.isArray(record[key])) return record[key];
    }
  }
  return parsed;
}

export async function generateQuestions(
  input: GenerateQuestionsInput,
  userId: string
): Promise<DraftQuestion[]> {
  const startTime = Date.now();
  const llm = createLLMClient();
  const maxRetries = parseInt(process.env.LLM_MAX_RETRIES ?? "2", 10);

  const composition = resolveComposition({ ...input, count: input.count ?? 1 });
  const questionTypeLabel = QUESTION_TYPE_LABELS[composition.questionType];
  const difficultyLabel = DIFFICULTY_LABELS[input.difficulty] ?? input.difficulty;

  const chapterNames = input.topics?.length ? input.topics : [input.topic];
  const retrievalQuery = chapterNames.join(" ");

  let ragContext = "";
  if (process.env.RAG_ENABLED !== "false") {
    try {
      ragContext = await retrieveKurikulumContext(input.subject, input.grade, retrievalQuery);
    } catch {
      // RAG kurikulum gagal, lanjut tanpa konteks
    }
  }

  let materialContext = "";
  if (input.materialId) {
    materialContext = await retrieveUserMaterialContext(input.materialId, userId, retrievalQuery);
    if (!materialContext.trim()) {
      throw new Error("MATERIAL_NOT_READY");
    }
  }

  const ragSection = ragContext.trim()
    ? `\n=== KONTEKS KURIKULUM (gunakan sebagai acuan kompetensi) ===\n${ragContext}\n============================================================\n`
    : "";

  const materialSection = materialContext.trim()
    ? `\n=== KONTEKS MATERI DARI DOKUMEN ANDA ===\n${materialContext}\n=========================================\n\nBuatkan soal yang merujuk langsung pada materi di atas.\n`
    : "";

  const mixParts = [
    composition.multipleChoiceCount > 0
      ? `${composition.multipleChoiceCount} soal pilihan ganda (type: MULTIPLE_CHOICE, 4 pilihan A-D)`
      : "",
    composition.shortAnswerCount > 0
      ? `${composition.shortAnswerCount} soal isian singkat (type: SHORT_ANSWER)`
      : "",
    composition.essayCount > 0
      ? `${composition.essayCount} soal cerita/esai (type: ESSAY, correctText berisi poin jawaban uraian)`
      : "",
  ].filter(Boolean);
  const mixHint =
    mixParts.length > 0
      ? `Komposisi WAJIB tepat: ${mixParts.join("; ")}. Total ${composition.total} soal. Setiap item WAJIB punya field type sesuai jenisnya.`
      : "";

  const chapterHint =
    chapterNames.length > 1
      ? `Cakupan bab: ${input.topic}. Sebar soal merata ke semua bab berikut: ${chapterNames.join("; ")}. Setiap item WAJIB punya field topic berisi nama bab yang diuji. Jika jumlah soal >= jumlah bab, setiap bab minimal muncul sekali.`
      : `Fokus hanya pada bab/topik: ${chapterNames[0]}.`;

  const userPrompt = `Buatkan ${composition.total} soal ${questionTypeLabel} untuk:
- Mata Pelajaran   : ${input.subject}
- Kelas            : ${input.grade} SD
- Cakupan bab      : ${input.topic}
- Tingkat Kesulitan: ${difficultyLabel}
- Kurikulum        : ${input.curriculum ?? "Kurikulum Merdeka"}
${ragSection}${materialSection}${chapterHint}
${mixHint}

Format respons HARUS berupa JSON array (atau objek {"questions": [...]}) dengan struktur berikut:
${schemaExample(composition.questionType)}`;

  let lastError: Error | null = null;
  let status: "SUCCESS" | "FAILED" | "FALLBACK" = "FAILED";
  let inputTokens: number | undefined;
  let outputTokens: number | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await llm.chat([
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ]);

      inputTokens = response.inputTokens;
      outputTokens = response.outputTokens;

      const parsed = extractJSON(response.text);
      if (!parsed) throw new Error("Gagal parse JSON dari respons LLM");

      const validated = LLMResponseSchema.parse(parsed);
      const drafts = validated
        .map((item) => {
          const type = inferType(item, composition.questionType);
          return {
            type,
            topic: item.topic,
            prompt: item.prompt,
            choices: item.choices,
            correctKey: item.correctKey,
            correctText: item.correctText,
            explanation: item.explanation,
            weight: weightForType(type, composition),
          };
        })
        .filter(isUsableDraft)
        .map(sanitizeDraft);

      if (drafts.length === 0) {
        throw new Error("Tidak ada soal valid dari output LLM");
      }

      status = "SUCCESS";
      await logLLM({
        userId,
        input: { ...input, questionType: composition.questionType, count: composition.total },
        status,
        startTime,
        inputTokens,
        outputTokens,
      });
      return drafts.slice(0, composition.total);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (lastError.message === "MATERIAL_NOT_READY") throw lastError;
    }
  }

  if (input.materialId) {
    await logLLM({
      userId,
      input,
      status: "FAILED",
      startTime,
      errorMessage: lastError?.message,
    });
    throw new Error("LLM_UNAVAILABLE");
  }

  const fallback = await getFallbackQuestions({ ...input, count: composition.total });
  if (fallback.length > 0) {
    status = "FALLBACK";
    await logLLM({ userId, input, status, startTime, errorMessage: lastError?.message });
    return fallback;
  }

  await logLLM({ userId, input, status: "FAILED", startTime, errorMessage: lastError?.message });
  throw new Error("LLM_UNAVAILABLE");
}

async function logLLM(params: {
  userId: string;
  input: GenerateQuestionsInput;
  status: "SUCCESS" | "FAILED" | "FALLBACK";
  startTime: number;
  inputTokens?: number;
  outputTokens?: number;
  errorMessage?: string;
}) {
  try {
    await prisma.lLMLog.create({
      data: {
        userId: params.userId,
        provider: process.env.LLM_PROVIDER ?? "openai",
        model: process.env.LLM_MODEL ?? "gpt-4o-mini",
        subject: params.input.subject,
        grade: params.input.grade,
        topic: params.input.topic,
        difficulty: params.input.difficulty,
        questionType: params.input.questionType,
        count: params.input.count ?? 1,
        status: params.status,
        durationMs: Date.now() - params.startTime,
        inputTokens: params.inputTokens,
        outputTokens: params.outputTokens,
        errorMessage: params.errorMessage,
      },
    });
  } catch {
    // Log failure tidak boleh menghentikan alur utama
  }
}
