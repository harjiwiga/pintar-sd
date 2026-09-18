import { z } from "zod";

export const QuizScoreSchema = z.object({
  answers: z
    .array(
      z.object({
        questionId: z.string().min(1),
        studentAnswer: z.string(),
      })
    )
    .min(1)
    .max(50),
});
