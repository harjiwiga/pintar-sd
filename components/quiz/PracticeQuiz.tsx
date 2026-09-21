"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  Calculator,
  CheckCircle2,
  CircleHelp,
  Download,
  Landmark,
  Languages,
  Leaf,
  Loader2,
  RotateCcw,
  Sigma,
  WifiOff,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/layout/PageChrome";
import { questionTypeLabel } from "@/lib/questionLabels";
import { cn } from "@/lib/utils";
import { EssayAnswerInput, type EssayAnswerHandle } from "@/components/quiz/EssayAnswerInput";
import {
  mergeSubjectCounts,
  packHasGradingKeys,
  scorePracticeLocally,
  type OfflinePracticePack,
  type OfflinePracticeQuestion,
  type OfflineSubjectSummary,
} from "@/lib/offlinePractice";
import {
  getOfflinePracticePack,
  hydratePackImages,
  listOfflineSubjectSummaries,
  saveOfflinePracticePack,
} from "@/lib/offlinePracticeDb";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

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
  imageDataUrl?: string | null;
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

type SubjectCount = OfflineSubjectSummary;

function toDisplayQuestions(questions: OfflinePracticeQuestion[]): QuizQuestion[] {
  return questions.map((q) => ({
    ...q,
    imageUrl: q.imageDataUrl || q.imageUrl || null,
  }));
}

export function PracticeQuiz({
  generatePath,
  materiPath,
}: {
  generatePath: string;
  materiPath: string;
}) {
  const online = useOnlineStatus();
  const [subjects, setSubjects] = useState<SubjectCount[] | null>(null);
  const [offlineSubjects, setOfflineSubjects] = useState<SubjectCount[]>([]);
  const [subject, setSubject] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[] | null>(null);
  const [gradingPack, setGradingPack] = useState<OfflinePracticeQuestion[] | null>(null);
  const [fromOfflineCache, setFromOfflineCache] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [results, setResults] = useState<QuizResult[] | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [scoring, setScoring] = useState(false);
  const [savingOffline, setSavingOffline] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [inkById, setInkById] = useState<Record<string, boolean>>({});
  const essayRefs = useRef<Record<string, EssayAnswerHandle | null>>({});

  async function refreshOfflineSubjects() {
    try {
      const offline = await listOfflineSubjectSummaries();
      setOfflineSubjects(offline);
      return offline;
    } catch {
      setOfflineSubjects([]);
      return [] as SubjectCount[];
    }
  }

  async function loadSubjects() {
    setLoading(true);
    setError("");
    setInfo("");
    const offline = await refreshOfflineSubjects();

    if (!online) {
      const onlyOffline = offline.filter((item) => item.count > 0);
      setSubjects(onlyOffline);
      if (onlyOffline.length === 0) {
        setError("Anda sedang offline dan belum ada paket latihan tersimpan. Sambungkan internet, lalu klik Simpan offline.");
      }
      setLoading(false);
      return;
    }

    try {
      const [quizRes, subjectRes] = await Promise.all([
        fetch("/api/quiz/questions"),
        fetch("/api/subjects"),
      ]);
      const quizData = quizRes.ok ? await quizRes.json() : null;
      const subjectData = subjectRes.ok ? await subjectRes.json() : null;

      const fromQuiz: SubjectCount[] = quizData?.success ? quizData.meta?.subjects ?? [] : [];
      let catalog = fromQuiz;
      if (catalog.length === 0) {
        catalog = (subjectData?.data ?? []).map((item: { name: string }) => ({
          name: item.name,
          count: 0,
        }));
      }
      setSubjects(mergeSubjectCounts(catalog, offline));
      if (!quizData?.success && catalog.length === 0 && offline.length === 0) {
        setError(quizData?.error?.message ?? "Gagal memuat mata pelajaran.");
      }
    } catch {
      const onlyOffline = offline.filter((item) => item.count > 0);
      setSubjects(onlyOffline.length > 0 ? mergeSubjectCounts([], offline) : []);
      setError(
        onlyOffline.length > 0
          ? "Server tidak terjangkau. Menampilkan paket offline yang tersimpan."
          : "Gagal memuat mata pelajaran. Muat ulang halaman, lalu coba lagi."
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadQuestions(selected: string) {
    setLoading(true);
    setError("");
    setInfo("");
    setResults(null);
    setScore(null);
    setAnswers({});
    setInkById({});
    setGradingPack(null);
    setFromOfflineCache(false);

    if (!online) {
      try {
        const pack = await getOfflinePracticePack(selected);
        if (!pack?.questions.length) {
          setError(`Belum ada paket offline untuk ${selected}. Sambungkan internet lalu simpan offline dulu.`);
          setQuestions([]);
          return;
        }
        setGradingPack(pack.questions);
        setQuestions(toDisplayQuestions(pack.questions));
        setFromOfflineCache(true);
        setInfo("Mode offline: skor dihitung di perangkat. Stylus/OCR vision memerlukan koneksi.");
      } catch {
        setError("Gagal membaca paket offline di perangkat.");
        setQuestions([]);
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      const res = await fetch(`/api/quiz/questions?subject=${encodeURIComponent(selected)}&limit=20`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data) && data.data.length > 0) {
        setSubjects(data.meta?.subjects ? mergeSubjectCounts(data.meta.subjects, offlineSubjects) : subjects);
        setQuestions(data.data);
        const cached = await getOfflinePracticePack(selected);
        if (cached?.questions.length) {
          setGradingPack(cached.questions);
          setInfo("Paket offline tersedia — skor bisa dihitung tanpa server.");
        }
        return;
      }

      const pack = await getOfflinePracticePack(selected);
      if (pack?.questions.length) {
        setGradingPack(pack.questions);
        setQuestions(toDisplayQuestions(pack.questions));
        setFromOfflineCache(true);
        setInfo("Soal diambil dari paket offline di perangkat.");
        return;
      }

      setError(data.error?.message ?? "Gagal memuat soal.");
      setQuestions([]);
    } catch {
      try {
        const pack = await getOfflinePracticePack(selected);
        if (pack?.questions.length) {
          setGradingPack(pack.questions);
          setQuestions(toDisplayQuestions(pack.questions));
          setFromOfflineCache(true);
          setInfo("Server tidak terjangkau. Memakai paket offline.");
          return;
        }
      } catch {
        /* ignore */
      }
      setError("Gagal memuat soal. Muat ulang halaman, lalu coba lagi.");
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  }

  async function saveSubjectOffline(selected: string) {
    if (!online) {
      setError("Perlu koneksi internet untuk mengunduh paket offline.");
      return;
    }
    setSavingOffline(selected);
    setError("");
    setInfo("");
    try {
      const res = await fetch(`/api/quiz/offline-pack?subject=${encodeURIComponent(selected)}&limit=40`);
      const data = await res.json();
      if (!data.success || !data.data) {
        setError(data.error?.message ?? "Gagal mengunduh paket offline.");
        return;
      }
      const raw = data.data as OfflinePracticePack;
      if (!raw.questions?.length) {
        setError(`Belum ada soal ${selected} untuk disimpan offline.`);
        return;
      }
      const hydrated = await hydratePackImages(raw);
      await saveOfflinePracticePack(hydrated);
      const offline = await refreshOfflineSubjects();
      setSubjects((prev) => mergeSubjectCounts(prev ?? data.meta?.subjects ?? [], offline));
      if (subject === selected && questions?.length) {
        setGradingPack(hydrated.questions);
      }
      setInfo(`Paket ${selected} (${hydrated.questions.length} soal) siap dikerjakan offline.`);
    } catch {
      setError("Gagal menyimpan paket offline di perangkat.");
    } finally {
      setSavingOffline(null);
    }
  }

  useEffect(() => {
    void loadSubjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online]);

  function selectSubject(name: string) {
    setSubject(name);
    void loadQuestions(name);
  }

  function backToSubjects() {
    setSubject(null);
    setQuestions(null);
    setResults(null);
    setScore(null);
    setAnswers({});
    setInkById({});
    setGradingPack(null);
    setFromOfflineCache(false);
    setInfo("");
    void loadSubjects();
  }

  const answeredCount = useMemo(() => {
    if (!questions) return 0;
    return questions.filter((q) => (answers[q.id] ?? "").trim().length > 0 || inkById[q.id]).length;
  }, [questions, answers, inkById]);

  const resultById = useMemo(() => {
    return new Map((results ?? []).map((r) => [r.id, r]));
  }, [results]);

  const offlineReady = useMemo(() => {
    const map = new Map(offlineSubjects.map((item) => [item.name, item]));
    return map;
  }, [offlineSubjects]);

  async function handleScore() {
    if (!questions?.length) return;
    setScoring(true);
    setError("");
    const recognized: Record<string, string> = { ...answers };
    for (const question of questions) {
      if (question.type !== "ESSAY" && question.type !== "SHORT_ANSWER") continue;
      const text = await essayRefs.current[question.id]?.recognizeIfNeeded();
      if (typeof text === "string") recognized[question.id] = text;
    }
    setAnswers(recognized);

    const localSource =
      gradingPack && packHasGradingKeys(gradingPack)
        ? gradingPack
        : packHasGradingKeys(questions as OfflinePracticeQuestion[])
          ? (questions as OfflinePracticeQuestion[])
          : null;

    if (localSource) {
      try {
        const byId = new Map(localSource.map((q) => [q.id, q]));
        const ordered: OfflinePracticeQuestion[] = [];
        for (const live of questions) {
          const keyed = byId.get(live.id);
          if (!keyed) continue;
          ordered.push({
            ...keyed,
            type: live.type ?? keyed.type,
            prompt: live.prompt ?? keyed.prompt,
            weight: live.weight ?? keyed.weight,
          });
        }
        const data = scorePracticeLocally(ordered, recognized);
        setScore(data.score);
        setCorrectCount(data.correctCount);
        setResults(data.results);
        setScoring(false);
        return;
      } catch {
        if (!online) {
          setError("Paket offline tidak lengkap (kunci jawaban hilang). Unduh ulang saat online.");
          setScoring(false);
          return;
        }
      }
    }

    if (!online) {
      setError("Skor offline membutuhkan paket yang sudah disimpan. Sambungkan internet lalu klik Simpan offline.");
      setScoring(false);
      return;
    }

    try {
      const res = await fetch("/api/quiz/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: questions.map((q) => ({
            questionId: q.id,
            studentAnswer: recognized[q.id] ?? "",
          })),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setScore(data.data.score);
        setCorrectCount(data.data.correctCount);
        setResults(data.data.results);
      } else {
        setError(data.error?.message ?? "Gagal menghitung skor.");
      }
    } catch {
      setError("Gagal menghitung skor. Periksa koneksi, atau simpan paket offline lebih dulu.");
    } finally {
      setScoring(false);
    }
  }

  if (loading && !subject) {
    return (
      <div className="surface flex items-center justify-center py-16 text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menyiapkan daftar mata pelajaran...
      </div>
    );
  }

  if (!subject) {
    if (!subjects?.length) {
      return (
        <EmptyState
          icon={<CircleHelp className="h-6 w-6" />}
          title="Belum ada soal untuk dikerjakan"
          description="Unggah dokumen materi, generate soal per mata pelajaran, lalu simpan ke bank soal."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild>
                <Link href={generatePath}>Buat soal AI</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={materiPath}>Unggah dokumen</Link>
              </Button>
            </div>
          }
        />
      );
    }

    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Pilih mata pelajaran</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Soal dipisah per mapel. Simpan paket offline untuk latihan pribadi tanpa internet. Tugas dari guru tetap
            membutuhkan koneksi.
          </p>
        </div>
        {!online ? (
          <p className="flex items-start gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-950">
            <WifiOff className="mt-0.5 h-4 w-4 shrink-0" />
            Mode offline: hanya mapel yang sudah disimpan di perangkat yang bisa dikerjakan.
          </p>
        ) : null}
        {error ? <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
        {info ? <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{info}</p> : null}
        <div className="grid gap-3 md:grid-cols-2">
          {subjects.map((item) => {
            const visual = subjectVisual(item.name);
            const Icon = visual.icon;
            const cached = offlineReady.get(item.name);
            return (
              <div key={item.name} className="surface flex flex-col gap-3 p-5 transition hover:shadow-soft">
                <button
                  type="button"
                  onClick={() => selectSubject(item.name)}
                  className="flex items-start gap-4 text-left"
                  disabled={item.count === 0 && !cached?.count}
                >
                  <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl", visual.badge)}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold">{item.name}</span>
                    <span className="mt-1 block text-sm text-muted-foreground">
                      {item.count} soal siap dikerjakan
                      {cached?.count ? ` · offline ${cached.count}` : ""}
                    </span>
                  </span>
                </button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!online || item.count === 0 || savingOffline === item.name}
                  onClick={() => void saveSubjectOffline(item.name)}
                >
                  {savingOffline === item.name ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="h-3.5 w-3.5" />
                  )}
                  {cached?.count ? "Perbarui offline" : "Simpan offline"}
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (loading || questions === null) {
    return (
      <div className="surface flex items-center justify-center py-16 text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menyiapkan lembar {subject}...
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <EmptyState
        icon={<BookOpen className="h-6 w-6" />}
        title={`Belum ada soal ${subject}`}
        description="Generate soal untuk mapel ini, simpan ke bank soal, lalu kembali ke halaman Soal."
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button type="button" variant="outline" onClick={backToSubjects}>
              Pilih mapel lain
            </Button>
            <Button asChild>
              <Link href={generatePath}>Buat soal AI</Link>
            </Button>
          </div>
        }
      />
    );
  }

  return (
    <div className="space-y-6 pb-28">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="outline" size="sm" onClick={backToSubjects}>
          <ArrowLeft className="h-4 w-4" />
          Ganti mapel
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="brand">{subject}</Badge>
          <Badge>{questions.length} soal</Badge>
          {fromOfflineCache || !online ? <Badge tone="warning">Offline</Badge> : null}
          {gradingPack ? <Badge tone="success">Skor lokal siap</Badge> : null}
        </div>
      </div>

      {score !== null ? (
        <section className="surface overflow-hidden">
          <div className="grid gap-6 p-6 md:grid-cols-[auto_1fr_auto] md:items-center">
            <ScoreRing score={score} />
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Hasil {subject}
              </p>
              <h2 className="mt-1 font-display text-2xl font-bold">
                {score >= 80 ? "Kerja bagus!" : score >= 60 ? "Hampir tuntas" : "Perlu ditinjau ulang"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {correctCount} benar dari {questions.length} soal {subject}. Benar semua = 100; soal salah mengurangi skor
                sesuai bobotnya.
              </p>
            </div>
            <Button variant="outline" onClick={() => void loadQuestions(subject)}>
              <RotateCcw className="h-4 w-4" />
              Ulangi
            </Button>
          </div>
        </section>
      ) : null}

      {error ? <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      {info ? <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{info}</p> : null}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!online || savingOffline === subject}
          onClick={() => void saveSubjectOffline(subject)}
        >
          {savingOffline === subject ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          Simpan offline
        </Button>
      </div>

      {questions.some((q) => q.type === "ESSAY" || q.type === "SHORT_ANSWER") ? (
        <p className="rounded-2xl bg-primary/5 px-4 py-3 text-sm text-foreground">
          Soal esai dan isian punya kotak <span className="font-semibold">Pena</span>. Di laptop bisa digambar dengan
          mouse; di tablet pakai stylus atau jari. Tombol Ketik tetap ada. Baca tulisan pena memakai Gemini Vision
          (perlu online).
        </p>
      ) : (
        <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Lembar ini hanya pilihan ganda, jadi kotak pena tidak muncul. Generate soal dengan jumlah esai atau isian
          singkat lebih dari 0, lalu kembali ke sini.
        </p>
      )}

      <ol className="space-y-4">
        {questions.map((question, index) => {
          const result = resultById.get(question.id);
          const imageSrc = question.imageDataUrl || question.imageUrl;
          return (
            <li key={question.id} className="surface p-5 sm:p-6">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {index + 1}
                </span>
                <Badge tone="brand">{questionTypeLabel(question.type)}</Badge>
                <Badge>Kelas {question.grade}</Badge>
                <Badge>Bobot {question.weight ?? 1}</Badge>
              </div>
              <p className="font-display text-lg font-semibold leading-7">{question.prompt}</p>
              {imageSrc ? (
                <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-muted/30">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageSrc}
                    alt="Gambar pendukung soal"
                    className="mx-auto max-h-72 w-auto object-contain"
                  />
                </div>
              ) : null}
              <p className="mt-1 text-xs text-muted-foreground">{question.topic}</p>

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
                          disabled={Boolean(result)}
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
                  disabled={Boolean(result)}
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
                  disabled={Boolean(result)}
                  onChange={(e) => setAnswers((prev) => ({ ...prev, [question.id]: e.target.value }))}
                />
              )}

              {result ? (
                <div
                  className={cn("mt-4 rounded-2xl p-4", result.isCorrect ? "bg-emerald-50" : "bg-amber-50")}
                >
                  <p
                    className={cn(
                      "flex items-center gap-2 font-semibold",
                      result.isCorrect ? "text-emerald-800" : "text-amber-900"
                    )}
                  >
                    {result.isCorrect ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                    {result.isCorrect
                      ? "Jawaban benar"
                      : `Belum tepat — skor berkurang ${result.deducted ?? 0} poin`}
                  </p>
                  {!result.isCorrect ? (
                    <div className="mt-2 space-y-2 text-sm leading-6 text-foreground">
                      <p>
                        <span className="font-semibold">Jawaban anak: </span>
                        {result.studentAnswer.trim() ? result.studentAnswer : "(kosong)"}
                      </p>
                      <p>
                        <span className="font-semibold">
                          {question.type === "MULTIPLE_CHOICE" || question.type === "TRUE_FALSE"
                            ? "Kunci jawaban: "
                            : "Jawaban yang diharapkan: "}
                        </span>
                        {result.correctAnswer}
                      </p>
                      <p className="rounded-xl bg-white/80 px-3 py-2">{result.explanation}</p>
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

      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-border/80 bg-background/95 p-4 backdrop-blur lg:left-72">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {subject} · {answeredCount}/{questions.length} soal terjawab
            {!online ? " · offline" : ""}
          </p>
          <Button size="lg" onClick={() => void handleScore()} disabled={scoring || score !== null}>
            {scoring ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />}
            {score !== null ? `Skor ${score}` : "Hitung skor"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function subjectVisual(name: string) {
  const key = name.toLowerCase();
  if (key.includes("matematika")) return { icon: Sigma, badge: "bg-sky-100 text-sky-800" };
  if (key.includes("indonesia")) return { icon: Languages, badge: "bg-amber-100 text-amber-800" };
  if (key.includes("ipas")) return { icon: Leaf, badge: "bg-emerald-100 text-emerald-800" };
  if (key.includes("pkn") || key.includes("ppkn")) return { icon: Landmark, badge: "bg-violet-100 text-violet-800" };
  return { icon: BookOpen, badge: "bg-primary/10 text-primary" };
}

function ScoreRing({ score }: { score: number }) {
  const tone = score >= 80 ? "text-emerald-600" : score >= 60 ? "text-amber-600" : "text-red-600";
  return (
    <div className="relative flex h-24 w-24 items-center justify-center">
      <svg viewBox="0 0 36 36" className="h-24 w-24 -rotate-90">
        <path
          className="fill-none stroke-muted"
          strokeWidth="3.2"
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
        />
        <path
          className={cn("fill-none stroke-current", tone)}
          strokeWidth="3.2"
          strokeDasharray={`${score}, 100`}
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
        />
      </svg>
      <span className={cn("absolute text-2xl font-bold", tone)}>{score}</span>
    </div>
  );
}
