import { z } from "zod";

export const QuestionTypeSchema = z.enum([
  "MULTIPLE_CHOICE",
  "TRUE_FALSE",
  "SHORT_ANSWER",
  "ESSAY",
]);

export const GenerateQuestionsSchema = z
  .object({
    subject: z.string().min(1),
    grade: z.number().int().min(1).max(6),
    topic: z.string().min(1),
    topics: z.array(z.string().min(1)).min(1).max(20).optional(),
    difficulty: z.enum(["EASY", "MEDIUM", "HARD"]),
    questionType: z
      .enum(["MULTIPLE_CHOICE", "TRUE_FALSE", "SHORT_ANSWER", "ESSAY", "MIXED"])
      .optional()
      .default("MIXED"),
    count: z.number().int().min(1).max(20).optional(),
    multipleChoiceCount: z.number().int().min(0).max(20).optional(),
    shortAnswerCount: z.number().int().min(0).max(20).optional(),
    essayCount: z.number().int().min(0).max(20).optional(),
    multipleChoiceWeight: z.number().int().min(1).max(100).optional(),
    shortAnswerWeight: z.number().int().min(1).max(100).optional(),
    essayWeight: z.number().int().min(1).max(100).optional(),
    language: z.string().optional(),
    curriculum: z.string().optional(),
    materialId: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    const total =
      (value.multipleChoiceCount ?? 0) + (value.shortAnswerCount ?? 0) + (value.essayCount ?? 0);
    if (value.multipleChoiceCount !== undefined || value.shortAnswerCount !== undefined || value.essayCount !== undefined) {
      if (total < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Isi minimal satu jumlah soal (pilihan ganda, isian, atau esai).",
        });
      }
      if (total > 20) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Total soal maksimal 20.",
        });
      }
    } else if (!value.count) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Jumlah soal wajib diisi.",
      });
    }
  });

export const SaveQuestionSchema = z.object({
  type: QuestionTypeSchema,
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
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]),
  topicId: z.string().cuid(),
  source: z.enum(["AI_GENERATED", "MANUAL"]).default("MANUAL"),
  weight: z.number().int().min(1).max(100).default(1),
  figureId: z.string().cuid().optional().nullable(),
});

export const UpdateQuestionSchema = SaveQuestionSchema.partial();

export const QuestionFilterSchema = z.object({
  subjectId: z.string().cuid().optional(),
  topicId: z.string().cuid().optional(),
  grade: z.coerce.number().int().min(1).max(6).optional(),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).optional(),
  type: QuestionTypeSchema.optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});
