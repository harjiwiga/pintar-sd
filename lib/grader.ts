import { calculateWeightedScore } from "@/lib/questionComposition";
import { normalizeText, significantWords } from "@/lib/textChunker";

export { normalizeText };

export function gradeAnswer(params: {
  questionType: string;
  correctKey?: string | null;
  correctText?: string | null;
  studentAnswer: string;
}): boolean {
  const { questionType, correctKey, correctText, studentAnswer } = params;

  if (questionType === "MULTIPLE_CHOICE" || questionType === "TRUE_FALSE") {
    return normalizeText(studentAnswer) === normalizeText(correctKey ?? "");
  }

  if (questionType === "SHORT_ANSWER") {
    return normalizeText(studentAnswer) === normalizeText(correctText ?? "");
  }

  if (questionType === "ESSAY") {
    return gradeEssay(correctText ?? "", studentAnswer);
  }

  return false;
}

export function gradeEssay(correctText: string, studentAnswer: string): boolean {
  const answer = normalizeText(studentAnswer);
  const expected = normalizeText(correctText);
  if (!answer || answer.length < 8) return false;
  if (answer === expected) return true;

  const keys = significantWords(expected);
  if (keys.length === 0) return answer.length >= 20;

  const hits = keys.filter((word) => answer.includes(word)).length;
  return hits / keys.length >= 0.5;
}

export function calculateScore(answers: Array<{ isCorrect: boolean | null }>): number {
  const total = answers.length;
  if (total === 0) return 0;
  const correct = answers.filter((a) => a.isCorrect === true).length;
  return Math.round((correct / total) * 100);
}

export interface QuizItemInput {
  id: string;
  type: string;
  prompt: string;
  correctKey?: string | null;
  correctText?: string | null;
  explanation: string;
  studentAnswer: string;
  weight?: number | null;
}

export interface QuizItemResult {
  id: string;
  prompt: string;
  type: string;
  studentAnswer: string;
  isCorrect: boolean;
  correctAnswer: string;
  explanation: string;
  correction: string | null;
  weight: number;
  deducted: number;
}

export function scoreQuiz(items: QuizItemInput[]): {
  score: number;
  correctCount: number;
  total: number;
  totalWeight: number;
  earnedWeight: number;
  results: QuizItemResult[];
} {
  const totalWeight = items.reduce((sum, item) => sum + Math.max(1, item.weight ?? 1), 0);
  const results = items.map((item) => {
    const isCorrect = gradeAnswer({
      questionType: item.type,
      correctKey: item.correctKey,
      correctText: item.correctText,
      studentAnswer: item.studentAnswer,
    });

    const correctAnswer =
      item.type === "MULTIPLE_CHOICE" || item.type === "TRUE_FALSE"
        ? item.correctKey ?? ""
        : item.correctText ?? "";
    const weight = Math.max(1, item.weight ?? 1);
    const deducted = isCorrect || totalWeight === 0 ? 0 : Math.round((weight / totalWeight) * 100);

    return {
      id: item.id,
      prompt: item.prompt,
      type: item.type,
      studentAnswer: item.studentAnswer,
      isCorrect,
      correctAnswer,
      explanation: item.explanation,
      correction: isCorrect
        ? null
        : buildCorrection(item.type, correctAnswer, item.explanation),
      weight,
      deducted,
    };
  });

  const earnedWeight = results.reduce((sum, item) => sum + (item.isCorrect ? item.weight : 0), 0);

  return {
    score: calculateWeightedScore(results),
    correctCount: results.filter((r) => r.isCorrect).length,
    total: results.length,
    totalWeight,
    earnedWeight,
    results,
  };
}

export function buildCorrection(
  type: string,
  correctAnswer: string,
  explanation: string
): string {
  const label =
    type === "ESSAY" || type === "SHORT_ANSWER"
      ? "Jawaban yang diharapkan"
      : "Kunci jawaban";
  return `${label}: ${correctAnswer}\n\nPembahasan: ${explanation}`;
}
