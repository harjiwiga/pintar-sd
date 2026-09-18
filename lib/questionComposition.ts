import type { GenerateQuestionType, GenerateQuestionsInput } from "@/types";
import type { QuestionType } from "@prisma/client";

export interface QuestionComposition {
  multipleChoiceCount: number;
  shortAnswerCount: number;
  essayCount: number;
  multipleChoiceWeight: number;
  shortAnswerWeight: number;
  essayWeight: number;
  total: number;
  questionType: GenerateQuestionType;
}

export function resolveComposition(input: GenerateQuestionsInput): QuestionComposition {
  const hasDetail =
    input.multipleChoiceCount !== undefined ||
    input.shortAnswerCount !== undefined ||
    input.essayCount !== undefined;

  let multipleChoiceCount = 0;
  let shortAnswerCount = 0;
  let essayCount = 0;

  if (hasDetail) {
    multipleChoiceCount = Math.max(0, input.multipleChoiceCount ?? 0);
    shortAnswerCount = Math.max(0, input.shortAnswerCount ?? 0);
    essayCount = Math.max(0, input.essayCount ?? 0);
  } else if (input.questionType === "SHORT_ANSWER") {
    shortAnswerCount = input.count;
  } else if (input.questionType === "ESSAY") {
    essayCount = input.count;
  } else if (input.questionType === "MIXED") {
    multipleChoiceCount = Math.ceil(input.count * 0.6);
    essayCount = input.count - multipleChoiceCount;
  } else {
    multipleChoiceCount = input.count;
  }

  const total = multipleChoiceCount + shortAnswerCount + essayCount;
  const kinds = [multipleChoiceCount > 0, shortAnswerCount > 0, essayCount > 0].filter(Boolean).length;
  const questionType: GenerateQuestionType =
    kinds > 1 ? "MIXED" : multipleChoiceCount > 0 ? "MULTIPLE_CHOICE" : shortAnswerCount > 0 ? "SHORT_ANSWER" : essayCount > 0 ? "ESSAY" : input.questionType;

  return {
    multipleChoiceCount,
    shortAnswerCount,
    essayCount,
    multipleChoiceWeight: Math.max(1, input.multipleChoiceWeight ?? 2),
    shortAnswerWeight: Math.max(1, input.shortAnswerWeight ?? 3),
    essayWeight: Math.max(1, input.essayWeight ?? 5),
    total: total || input.count,
    questionType,
  };
}

export function weightForType(type: QuestionType | string, composition: QuestionComposition): number {
  if (type === "SHORT_ANSWER") return composition.shortAnswerWeight;
  if (type === "ESSAY") return composition.essayWeight;
  return composition.multipleChoiceWeight;
}

export function calculateWeightedScore(
  items: Array<{ isCorrect: boolean | null; weight?: number | null }>
): number {
  const weights = items.map((item) => Math.max(1, item.weight ?? 1));
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  if (total === 0) return 0;
  const earned = items.reduce(
    (sum, item, index) => sum + (item.isCorrect === true ? weights[index] : 0),
    0
  );
  return Math.round((earned / total) * 100);
}
