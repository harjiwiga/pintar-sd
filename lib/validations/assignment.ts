import { z } from "zod";

export const CreateAssignmentSchema = z.object({
  title: z.string().min(3).max(200),
  classId: z.string().cuid(),
  questionIds: z.array(z.string().cuid()).min(1).max(50),
  dueDate: z
    .string()
    .optional()
    .transform((value) => {
      if (!value) return undefined;
      const parsed = value.length === 10 ? `${value}T16:00:00.000Z` : value;
      const date = new Date(parsed);
      return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
    }),
});

export const UpdateAssignmentSchema = CreateAssignmentSchema.partial();
