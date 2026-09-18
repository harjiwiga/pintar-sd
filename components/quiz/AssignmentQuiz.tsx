"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Calculator, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { questionTypeLabel } from "@/lib/questionLabels";
import { cn } from "@/lib/utils";
import { EssayAnswerInput, type EssayAnswerHandle } from "@/components/quiz/EssayAnswerInput";

interface QuizQuestion {
  id: string;
  type: string;
  prompt: string;
  choices?: Array<{ key: string; text: string }> | null;
  difficulty: string;
  topic: string;
  subject: string;
  grade: number;
  weight?: number;
  figureId?: string | null;
  imageUrl?: string | null;
  correctKey?: string | null;
  correctText?: string | null;
  explanation?: string;
}

interface QuizResult {
  id: string;
  prompt: string;
  type: string;
  studentAnswer: string;
  isCorrect: boolean;
  correctAnswer: string;
  explanation: string;
  correction: string | null;
  weight?: number;
  deducted?: number;
}

interface AssignmentPayload {
  id: string;
  title: string;
  dueDate?: string | null;
  className: string;
  questions: QuizQuestion[];
  submission: {
    id: string;
    submittedAt: string | null;
    score: number | null;
    answers: Array<{ questionId: string; answerText: string; isCorrect?: boolean | null }>;
  } | null;
}

export function AssignmentQuiz({ assignmentId }: { assignmentId: string }) {
  const [data, setData] = useState<AssignmentPayload | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [results, setResults] = useState<QuizResult[] | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [scoring, setScoring] = useState(false);
  const [error, setError] = useState("");
  const [inkById, setInkById] = useState<Record<string, boolean>>({});
  const essayRefs = useRef<Record<string, EssayAnswerHandle | null>>({});

  useEffect(() => {
    void loadAssignment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignmentId]);

  async function loadAssignment() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/siswa/assignments/${assignmentId}`);
      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message ?? "Tugas tidak ditemukan.");
        setData(null);
        return;
      }
      const payload = json.data as AssignmentPayload;
      setData(payload);
      const initial: Record<string, string> = {};
      for (const answer of payload.submission?.answers ?? []) {
        initial[answer.questionId] = answer.answerText;
      }
      setAnswers(initial);
      if (payload.submission?.submittedAt) {
        setScore(payload.submission.score);
        setResults(
          payload.questions.map((question) => {
            const studentAnswer = initial[question.id] ?? "";
            const correctAnswer =
              question.type === "MULTIPLE_CHOICE" || question.type === "TRUE_FALSE"
                ? question.correctKey ?? ""
                : question.correctText ?? "";
            const saved = payload.submission?.answers.find((item) => item.questionId === question.id);
            return {
              id: question.id,
              prompt: question.prompt,
              type: question.type,
              studentAnswer,
              isCorrect: saved?.isCorrect === true,
              correctAnswer,
              explanation: question.explanation ?? "",
              correction: saved?.isCorrect ? null : `Kunci: ${correctAnswer}`,
            };
          })
        );
        setCorrectCount(payload.submission.answers.filter((item) => item.isCorrect).length);
      }
    } catch {
      setError("Gagal memuat tugas. Muat ulang halaman, lalu coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  const questions = data?.questions ?? [];
  const locked = score !== null;
  const answeredCount = useMemo(
    () => questions.filter((question) => (answers[question.id] ?? "").trim().length > 0 || inkById[question.id]).length,
    [questions, answers, inkById]
  );
  const resultById = useMemo(() => new Map((results ?? []).map((item) => [item.id, item])), [results]);

  async function handleScore() {
    if (!data?.questions.length) return;
    setScoring(true);
    setError("");
    try {
      const start = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignmentId }),
      });
      const startJson = await start.json();
      if (!startJson.success) {
        setError(startJson.error?.message ?? "Tidak bisa memulai pengerjaan.");
        return;
      }
      if (startJson.data.submittedAt) {
        setError("Tugas ini sudah dikumpulkan.");
        await loadAssignment();
        return;
      }

      const submissionId = startJson.data.id as string;
      const recognized: Record<string, string> = { ...answers };
      for (const question of data.questions) {
        if (question.type !== "ESSAY" && question.type !== "SHORT_ANSWER") continue;
        const text = await essayRefs.current[question.id]?.recognizeIfNeeded();
        if (typeof text === "string") recognized[question.id] = text;
      }
      setAnswers(recognized);
      for (const question of data.questions) {
        const text = (recognized[question.id] ?? "").trim();
        if (!text) continue;
        const answerRes = await fetch(`/api/submissions/${submissionId}/answers`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ questionId: question.id, answerText: text }),
        });
        const answerJson = await answerRes.json();
        if (!answerJson.success) {
          setError(answerJson.error?.message ?? "Gagal menyimpan jawaban.");
          return;
        }
      }

      const finish = await fetch(`/api/submissions/${submissionId}/finish`, { method: "POST" });
      const finishJson = await finish.json();
      if (!finishJson.success) {
        setError(finishJson.error?.message ?? "Gagal menghitung skor.");
        return;
      }
      setScore(finishJson.data.score);
      setCorrectCount(finishJson.data.correctCount ?? 0);
      setResults(finishJson.data.results ?? []);
    } catch {
      setError("Gagal mengumpulkan jawaban. Coba lagi.");
    } finally {
      setScoring(false);
    }
  }

  if (loading) {
    return (
      <div className="surface flex items-center justify-center py-16 text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menyiapkan lembar tugas...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <Button asChild variant="outline" size="sm">
          <Link href="/siswa">
            <ArrowLeft className="h-4 w-4" />
            Kembali
          </Link>
        </Button>
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error || "Tugas tidak ditemukan."}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-28">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="outline" size="sm">
          <Link href="/siswa">
            <ArrowLeft className="h-4 w-4" />
            Daftar tugas
          </Link>
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="brand">{data.className}</Badge>
          <Badge>{questions.length} soal</Badge>
        </div>
      </div>

      <div>
        <h1 className="font-display text-2xl font-bold">{data.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Jawab semua soal, lalu kumpulkan. Benar semua = 100.
        </p>
      </div>

      {score !== null ? (
        <section className="surface p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">Hasil</p>
          <h2 className="mt-1 font-display text-2xl font-bold">
            Skor {score}
            <span className="ml-2 text-base font-medium text-muted-foreground">
              · {correctCount}/{questions.length} benar
            </span>
          </h2>
        </section>
      ) : null}

      {error ? <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      <ol className="space-y-4">
        {questions.map((question, index) => {
          const result = resultById.get(question.id);
          return (
            <li key={question.id} className="surface p-5 sm:p-6">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {index + 1}
                </span>
                <Badge tone="brand">{questionTypeLabel(question.type)}</Badge>
                <Badge>Bobot {question.weight ?? 1}</Badge>
              </div>
              <p className="font-display text-lg font-semibold leading-7">{question.prompt}</p>
              {question.imageUrl ? (
                <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-muted/30">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={question.imageUrl}
                    alt="Gambar pendukung soal"
                    className="mx-auto max-h-72 w-auto object-contain"
                  />
                </div>
              ) : null}
              <p className="mt-1 text-xs text-muted-foreground">
                {question.subject} · {question.topic}
              </p>

              {question.type === "MULTIPLE_CHOICE" && Array.isArray(question.choices) ? (
                <div className="mt-4 space-y-2">
                  {question.choices.map((choice) => {
                    const selected = answers[question.id] === choice.key;
                    const showKey = Boolean(result);
                    const isKey = result?.correctAnswer === choice.key;
                    const isWrongPick = showKey && selected && !result?.isCorrect;
                    return (
                      <label
                        key={choice.key}
                        className={cn(
                          "flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 text-sm transition",
                          showKey && isKey && "border-emerald-300 bg-emerald-50 text-emerald-950",
                          isWrongPick && "border-red-200 bg-red-50 text-red-900",
                          !showKey && selected && "border-primary bg-primary/10",
                          !showKey && !selected && "border-border hover:border-primary/40"
                        )}
                      >
                        <input
                          type="radio"
                          className="mt-1"
                          name={question.id}
                          value={choice.key}
                          checked={selected}
                          disabled={locked}
                          onChange={() => setAnswers((prev) => ({ ...prev, [question.id]: choice.key }))}
                        />
                        <span>
                          <span className="mr-1 font-bold">{choice.key}.</span>
                          {choice.text}
                        </span>
                      </label>
                    );
                  })}
                </div>
              ) : question.type === "ESSAY" || question.type === "SHORT_ANSWER" ? (
                <EssayAnswerInput
                  ref={(handle) => {
                    essayRefs.current[question.id] = handle;
                  }}
                  compact={question.type === "SHORT_ANSWER"}
                  value={answers[question.id] ?? ""}
                  disabled={locked}
                  placeholder={
                    question.type === "ESSAY"
                      ? "Tulis jawaban uraian dengan pena atau mouse, atau ketik di sini..."
                      : "Tulis jawaban singkat dengan pena atau mouse, atau ketik di sini..."
                  }
                  onChange={(text) => setAnswers((prev) => ({ ...prev, [question.id]: text }))}
                  onInkChange={(hasInk) => setInkById((prev) => ({ ...prev, [question.id]: hasInk }))}
                />
              ) : (
                <textarea
                  rows={2}
                  className="field-input mt-4 h-auto min-h-[96px] py-3"
                  placeholder="Tulis jawaban..."
                  value={answers[question.id] ?? ""}
                  disabled={locked}
                  onChange={(e) => setAnswers((prev) => ({ ...prev, [question.id]: e.target.value }))}
                />
              )}

              {result ? (
                <div className={cn("mt-4 rounded-2xl p-4", result.isCorrect ? "bg-emerald-50" : "bg-amber-50")}>
                  <p className={cn("flex items-center gap-2 font-semibold", result.isCorrect ? "text-emerald-800" : "text-amber-900")}>
                    {result.isCorrect ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                    {result.isCorrect ? "Jawaban benar" : `Belum tepat — skor berkurang ${result.deducted ?? 0} poin`}
                  </p>
                  {!result.isCorrect ? (
                    <div className="mt-2 space-y-2 text-sm leading-6">
                      <p>
                        <span className="font-semibold">Jawabanmu: </span>
                        {result.studentAnswer.trim() ? result.studentAnswer : "(kosong)"}
                      </p>
                      <p>
                        <span className="font-semibold">Kunci: </span>
                        {result.correctAnswer}
                      </p>
                      {result.explanation ? <p className="rounded-xl bg-white/80 px-3 py-2">{result.explanation}</p> : null}
                    </div>
                  ) : (
                    <p className="mt-1 text-sm text-emerald-900">{result.explanation}</p>
                  )}
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>

      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-border/80 bg-background/95 p-4 backdrop-blur">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {answeredCount}/{questions.length} soal terjawab
          </p>
          <Button size="lg" onClick={() => void handleScore()} disabled={scoring || locked}>
            {scoring ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />}
            {locked ? `Skor ${score}` : "Kumpulkan & hitung skor"}
          </Button>
        </div>
      </div>
    </div>
  );
}
