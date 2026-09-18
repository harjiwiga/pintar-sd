import { z } from "zod";

export const CreateSubmissionSchema = z.object({
  assignmentId: z.string().cuid(),
});

export const SubmitAnswerSchema = z.object({
  questionId: z.string().cuid(),
  answerText: z.string().min(1).max(4000),
});
