import type {
  User,
  StudentProfile,
  ClassRoom,
  Subject,
  Topic,
  Question,
  Assignment,
  Submission,
  Answer,
  QuestionType,
  Difficulty,
  QuestionSource,
  Role,
} from "@prisma/client";

// ─── Re-exports dari Prisma ────────────────────────────────────
export type {
  User,
  StudentProfile,
  ClassRoom,
  Subject,
  Topic,
  Question,
  Assignment,
  Submission,
  Answer,
  QuestionType,
  Difficulty,
  QuestionSource,
  Role,
};

// ─── API Response Envelope ────────────────────────────────────

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiSuccessPaginated<T> {
  success: true;
  data: T[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
  };
}

export interface ApiError {
  success: false;
  error: {
    code: ApiErrorCode;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "LLM_INVALID_OUTPUT"
  | "RATE_LIMITED"
  | "LLM_UNAVAILABLE"
  | "INTERNAL_ERROR";

// ─── LLM Generate Soal ───────────────────────────────────────

export type GenerateQuestionType =
  | "MULTIPLE_CHOICE"
  | "TRUE_FALSE"
  | "SHORT_ANSWER"
  | "ESSAY"
  | "MIXED";

export interface GenerateQuestionsInput {
  subject: string;
  grade: number; // 1..6
  topic: string;
  topics?: string[];
  difficulty: Difficulty;
  questionType: GenerateQuestionType;
  count?: number;
  multipleChoiceCount?: number;
  shortAnswerCount?: number;
  essayCount?: number;
  multipleChoiceWeight?: number;
  shortAnswerWeight?: number;
  essayWeight?: number;
  language?: string; // default "id"
  curriculum?: string; // default "Kurikulum Merdeka"
  materialId?: string; // user-uploaded material for RAG
}

export interface DraftQuestion {
  type?: QuestionType;
  topic?: string;
  weight?: number;
  prompt: string;
  choices?: Array<{ key: "A" | "B" | "C" | "D"; text: string }>;
  correctKey?: string;
  correctText?: string;
  explanation: string;
  figureId?: string | null;
}

// ─── Session / Auth ──────────────────────────────────────────

export type UserRole = Role | "STUDENT";

export interface SessionUser {
  id: string;
  name: string;
  email?: string;
  role: UserRole;
  studentProfileId?: string; // only when role === "STUDENT"
}

// ─── Compound types (with relations) ─────────────────────────

export type QuestionWithTopic = Question & {
  topic: Topic & { subject: Subject };
};

export type AssignmentWithQuestions = Assignment & {
  questions: Array<{ order: number; question: QuestionWithTopic }>;
};

export type SubmissionWithAnswers = Submission & {
  answers: Answer[];
  assignment: Assignment;
  student: StudentProfile;
};

export type ClassRoomWithStudents = ClassRoom & {
  students: StudentProfile[];
};
