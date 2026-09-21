import { scoreQuiz, type QuizItemInput, type QuizItemResult } from "@/lib/grader";

export type OfflinePracticeChoice = { key: string; text: string };

/** Soal latihan pribadi yang bisa dinilai offline (termasuk kunci). */
export interface OfflinePracticeQuestion {
  id: string;
  type: string;
  prompt: string;
  choices?: OfflinePracticeChoice[] | null;
  difficulty: string;
  topic: string;
  subject: string;
  grade: number;
  weight?: number;
  figureId?: string | null;
  imageUrl?: string | null;
  /** Data URL gambar untuk tampil offline */
  imageDataUrl?: string | null;
  correctKey?: string | null;
  correctText?: string | null;
  explanation: string;
}

export interface OfflinePracticePack {
  subject: string;
  savedAt: string;
  questions: OfflinePracticeQuestion[];
}

export interface OfflineSubjectSummary {
  name: string;
  count: number;
  savedAt?: string;
}

export function hasGradingKeys(question: {
  correctKey?: string | null;
  correctText?: string | null;
  explanation?: string | null;
}): boolean {
  // Kunci wajib ada; explanation saja tidak cukup untuk menilai.
  return (
    (question.correctKey != null && String(question.correctKey).length > 0) ||
    (question.correctText != null && String(question.correctText).length > 0)
  );
}

export function packHasGradingKeys(questions: OfflinePracticeQuestion[]): boolean {
  return questions.length > 0 && questions.every((q) => hasGradingKeys(q));
}

export function toScoreQuizItems(
  questions: OfflinePracticeQuestion[],
  answers: Record<string, string>
): QuizItemInput[] {
  return questions.map((question) => ({
    id: question.id,
    type: question.type,
    prompt: question.prompt,
    correctKey: question.correctKey ?? null,
    correctText: question.correctText ?? null,
    explanation: question.explanation ?? "",
    studentAnswer: answers[question.id] ?? "",
    weight: question.weight ?? 1,
  }));
}

export function scorePracticeLocally(
  questions: OfflinePracticeQuestion[],
  answers: Record<string, string>
): {
  score: number;
  correctCount: number;
  total: number;
  totalWeight: number;
  earnedWeight: number;
  results: QuizItemResult[];
} {
  if (!packHasGradingKeys(questions)) {
    throw new Error("OFFLINE_KEYS_MISSING");
  }
  return scoreQuiz(toScoreQuizItems(questions, answers));
}

export function summarizeOfflinePacks(packs: OfflinePracticePack[]): OfflineSubjectSummary[] {
  return packs
    .map((pack) => ({
      name: pack.subject,
      count: pack.questions.length,
      savedAt: pack.savedAt,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "id"));
}

export function mergeSubjectCounts(
  catalog: OfflineSubjectSummary[],
  offline: OfflineSubjectSummary[]
): OfflineSubjectSummary[] {
  const byName = new Map<string, OfflineSubjectSummary>();
  for (const item of catalog) {
    byName.set(item.name, { ...item });
  }
  for (const item of offline) {
    const existing = byName.get(item.name);
    if (existing) {
      byName.set(item.name, {
        ...existing,
        count: Math.max(existing.count, item.count),
        savedAt: item.savedAt ?? existing.savedAt,
      });
    } else {
      byName.set(item.name, { ...item });
    }
  }
  return Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name, "id"));
}
