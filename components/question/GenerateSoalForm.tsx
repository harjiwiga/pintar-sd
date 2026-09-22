"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FileText, ImagePlus, Loader2, PenLine, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StylusSketchPad } from "@/components/media/StylusSketchPad";
import { questionTypeLabel } from "@/lib/questionLabels";
import {
  chapterNumber,
  formatChapterOption,
  formatChapterScope,
  matchTopicId,
  sliceTopicRange,
} from "@/lib/chapterRange";
import { cn } from "@/lib/utils";

interface Subject {
  id: string;
  name: string;
  topics: Topic[];
}
interface Topic {
  id: string;
  name: string;
  grade: number;
}
interface Material {
  id: string;
  fileName: string;
  status: "PROCESSING" | "READY" | "FAILED";
  subject?: string | null;
  grade?: number | null;
  isOwner?: boolean;
  uploadedByName?: string;
  uploadedByRole?: string;
}
interface DraftQuestion {
  type?: string;
  topic?: string;
  weight?: number;
  prompt: string;
  choices?: Array<{ key: string; text: string }>;
  correctKey?: string;
  correctText?: string;
  explanation: string;
  figureId?: string | null;
}

interface MaterialFigure {
  id: string;
  pageNumber: number;
  width: number;
  height: number;
  nearbyText: string | null;
  areaRatio: number;
  url: string;
  relevance: number;
}

export function GenerateSoalForm({
  materiPath,
  practicePath,
}: {
  materiPath: string;
  practicePath: string;
}) {
  const searchParams = useSearchParams();
  const presetMaterial = searchParams.get("materialId") ?? "";

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [form, setForm] = useState({
    subject: "",
    grade: 4,
    topicId: "",
    chapterMode: "SINGLE" as "SINGLE" | "RANGE",
    topicToId: "",
    difficulty: "MEDIUM",
    multipleChoiceCount: 4,
    shortAnswerCount: 2,
    essayCount: 0,
    multipleChoiceWeight: 2,
    shortAnswerWeight: 3,
    essayWeight: 5,
    materialId: presetMaterial,
  });
  const [drafts, setDrafts] = useState<DraftQuestion[]>([]);
  const [savedIndexes, setSavedIndexes] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingAll, setSavingAll] = useState(false);
  const [error, setError] = useState("");
  const [materialFigures, setMaterialFigures] = useState<MaterialFigure[]>([]);
  const [figuresLoading, setFiguresLoading] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [stylusIndex, setStylusIndex] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/subjects")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setSubjects(d.data ?? []);
        else setError(d.error?.message ?? "Gagal memuat mata pelajaran.");
      })
      .catch(() => setError("Gagal memuat mata pelajaran."));
    fetch("/api/materials")
      .then((r) => r.json())
      .then((d) =>
        setMaterials(
          (d.data ?? []).filter(
            (m: Material) => m.status === "READY" && m.fileName !== "Unggahan gambar soal"
          )
        )
      );
  }, []);

  useEffect(() => {
    if (presetMaterial) setForm((prev) => ({ ...prev, materialId: presetMaterial }));
  }, [presetMaterial]);

  const selectedSubject = subjects.find((s) => s.name === form.subject);
  const filteredTopics = useMemo(
    () => selectedSubject?.topics.filter((t) => t.grade === form.grade) ?? [],
    [selectedSubject, form.grade]
  );

  const selectedChapters = useMemo(() => {
    if (form.chapterMode === "RANGE") {
      return sliceTopicRange(filteredTopics, form.topicId, form.topicToId || form.topicId);
    }
    return filteredTopics.filter((t) => t.id === form.topicId);
  }, [filteredTopics, form.chapterMode, form.topicId, form.topicToId]);

  const startChapterNumber = selectedChapters[0]
    ? chapterNumber(filteredTopics, selectedChapters[0].id)
    : 1;
  const chapterScope = formatChapterScope(selectedChapters, startChapterNumber);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (selectedChapters.length === 0) {
      setError("Pilih bab atau rentang bab terlebih dahulu.");
      return;
    }
    const total = form.multipleChoiceCount + form.shortAnswerCount + form.essayCount;
    if (total < 1) {
      setError("Isi minimal satu jumlah soal: pilihan ganda, isian, atau esai.");
      return;
    }
    if (total > 20) {
      setError("Total soal maksimal 20.");
      return;
    }
    setLoading(true);
    setError("");
    setDrafts([]);
    setSavedIndexes([]);
    setMaterialFigures([]);
    setFiguresLoading(Boolean(form.materialId));
    setStylusIndex(null);

    const res = await fetch("/api/questions/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject: form.subject,
        grade: form.grade,
        topic: chapterScope,
        topics: selectedChapters.map((t) => t.name),
        difficulty: form.difficulty,
        questionType: "MIXED",
        multipleChoiceCount: form.multipleChoiceCount,
        shortAnswerCount: form.shortAnswerCount,
        essayCount: form.essayCount,
        multipleChoiceWeight: form.multipleChoiceWeight,
        shortAnswerWeight: form.shortAnswerWeight,
        essayWeight: form.essayWeight,
        materialId: form.materialId || undefined,
      }),
    });

    const data = await res.json();
    if (data.success) {
      setDrafts(data.data);
      if (form.materialId) {
        setFiguresLoading(true);
        try {
          const figRes = await fetch(`/api/materials/${form.materialId}/figures`);
          const figData = await figRes.json();
          if (figData.success) setMaterialFigures(figData.data.figures ?? []);
          else setMaterialFigures([]);
        } catch {
          setMaterialFigures([]);
        } finally {
          setFiguresLoading(false);
        }
      } else {
        setMaterialFigures([]);
      }
    } else setError(data.error?.message ?? "Gagal generate soal.");
    setLoading(false);
  }

  function draftType(draft: DraftQuestion) {
    if (draft.type) return draft.type;
    if (draft.choices?.length) return "MULTIPLE_CHOICE";
    return "ESSAY";
  }

  function draftWeight(draft: DraftQuestion) {
    if (draft.weight && draft.weight > 0) return draft.weight;
    const type = draftType(draft);
    if (type === "SHORT_ANSWER") return form.shortAnswerWeight;
    if (type === "ESSAY") return form.essayWeight;
    return form.multipleChoiceWeight;
  }

  async function handleSave(draft: DraftQuestion, index: number) {
    const res = await fetch("/api/questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...draft,
        type: draftType(draft),
        weight: draftWeight(draft),
        difficulty: form.difficulty,
        topicId: matchTopicId(selectedChapters, draft.topic) ?? form.topicId,
        source: "AI_GENERATED",
        figureId: draft.figureId || null,
      }),
    });
    const data = await res.json();
    if (data.success) setSavedIndexes((prev) => [...prev, index]);
    else setError(data.error?.message ?? "Gagal menyimpan soal.");
    return data.success as boolean;
  }

  function setDraftFigure(index: number, figureId: string | null) {
    setDrafts((prev) => prev.map((d, i) => (i === index ? { ...d, figureId } : d)));
  }

  function figuresForDraft(draft: DraftQuestion): MaterialFigure[] {
    if (!materialFigures.length) return [];
    const ranked = [...materialFigures].sort((a, b) => {
      const ra = scoreLocal(draft.prompt, a);
      const rb = scoreLocal(draft.prompt, b);
      if (Math.abs(rb - ra) > 0.001) return rb - ra;
      return b.areaRatio - a.areaRatio;
    });
    return ranked.slice(0, 8);
  }

  async function handleUploadFigure(index: number, file: File | null) {
    if (!file || savedIndexes.includes(index)) return;
    setUploadingIndex(index);
    setError("");
    try {
      const body = new FormData();
      body.append("file", file);
      if (form.materialId) body.append("materialId", form.materialId);
      const res = await fetch("/api/figures/upload", { method: "POST", body });
      const data = await res.json();
      if (!data.success) {
        setError(data.error?.message ?? "Gagal mengunggah gambar.");
        return;
      }
      const fig = data.data as MaterialFigure;
      setMaterialFigures((prev) => {
        if (prev.some((p) => p.id === fig.id)) return prev;
        return [fig, ...prev];
      });
      setDraftFigure(index, fig.id);
      setStylusIndex(null);
    } catch {
      setError("Gagal mengunggah gambar.");
    } finally {
      setUploadingIndex(null);
    }
  }

  async function handleSaveAll() {
    setSavingAll(true);
    for (let i = 0; i < drafts.length; i++) {
      if (!savedIndexes.includes(i)) await handleSave(drafts[i], i);
    }
    setSavingAll(false);
  }

  const allSaved = drafts.length > 0 && savedIndexes.length === drafts.length;

  return (
    <div className="space-y-6">
      <form onSubmit={handleGenerate} className="surface p-6">
        <div className="mb-5 rounded-2xl border border-primary/15 bg-primary/5 p-4">
          <p className="text-sm font-semibold text-foreground">Sumber materi</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Pilih buku/referensi dari pustaka bersama (guru & orang tua). File yang sama tidak diunggah ulang.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <label className="field">
              <span className="field-label">Dokumen / buku referensi</span>
              <select
                value={form.materialId}
                onChange={(e) => setForm({ ...form, materialId: e.target.value })}
                className="field-input"
              >
                <option value="">Tanpa dokumen (dari topik)</option>
                {materials.map((m) => {
                  const who = m.isOwner
                    ? "unggahan saya"
                    : `${m.uploadedByRole ?? "Pengguna"} · ${m.uploadedByName ?? "Lain"}`;
                  const meta = [m.subject, m.grade ? `Kelas ${m.grade}` : null].filter(Boolean).join(" · ");
                  return (
                    <option key={m.id} value={m.id}>
                      {m.fileName}
                      {meta ? ` · ${meta}` : ""} · {who}
                    </option>
                  );
                })}
              </select>
            </label>
            <Button asChild variant="outline" type="button">
              <Link href={materiPath}>
                <FileText className="h-4 w-4" />
                Lihat pustaka
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="field">
            <span className="field-label">Mata pelajaran</span>
            <select
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value, topicId: "", topicToId: "" })}
              className="field-input"
              required
            >
              <option value="">Pilih mapel</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
            {subjects.length === 0 ? (
              <p className="mt-2 text-xs text-amber-800">
                Daftar mapel/bab kosong. Di server production jalankan seed database (`npm run prisma:seed`), lalu muat ulang
                halaman.
              </p>
            ) : null}
          </label>
          <label className="field">
            <span className="field-label">Kelas</span>
            <select
              value={form.grade}
              onChange={(e) => setForm({ ...form, grade: Number(e.target.value), topicId: "", topicToId: "" })}
              className="field-input"
            >
              {[1, 2, 3, 4, 5, 6].map((g) => (
                <option key={g} value={g}>
                  Kelas {g} SD
                </option>
              ))}
            </select>
          </label>
          <div className="field md:col-span-2">
            <span className="field-label">Cakupan bab</span>
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setForm({ ...form, chapterMode: "SINGLE", topicToId: "" })}
                className={cn(
                  "rounded-2xl border px-4 py-3 text-left transition",
                  form.chapterMode === "SINGLE"
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/40"
                )}
              >
                <span className="block text-sm font-semibold">Satu bab</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">Soal fokus pada satu topik/bab.</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  setForm({
                    ...form,
                    chapterMode: "RANGE",
                    topicToId: form.topicToId || form.topicId,
                  })
                }
                className={cn(
                  "rounded-2xl border px-4 py-3 text-left transition",
                  form.chapterMode === "RANGE"
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/40"
                )}
              >
                <span className="block text-sm font-semibold">Rentang bab</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">Misalnya Bab 2 sampai Bab 4.</span>
              </button>
            </div>
          </div>

          {form.chapterMode === "SINGLE" ? (
            <label className="field md:col-span-2">
              <span className="field-label">Bab</span>
              <select
                value={form.topicId}
                onChange={(e) => setForm({ ...form, topicId: e.target.value, topicToId: e.target.value })}
                className="field-input"
                required
              >
                <option value="">Pilih bab</option>
                {filteredTopics.map((t, i) => (
                  <option key={t.id} value={t.id}>
                    {formatChapterOption(i, t.name)}
                  </option>
                ))}
              </select>
              {form.subject && filteredTopics.length === 0 ? (
                <p className="mt-2 text-xs text-amber-800">
                  Belum ada bab untuk {form.subject} kelas {form.grade}. Jalankan seed DB atau pilih kelas lain.
                </p>
              ) : null}
            </label>
          ) : (
            <>
              <label className="field">
                <span className="field-label">Dari bab</span>
                <select
                  value={form.topicId}
                  onChange={(e) => setForm({ ...form, topicId: e.target.value })}
                  className="field-input"
                  required
                >
                  <option value="">Pilih bab awal</option>
                  {filteredTopics.map((t, i) => (
                    <option key={t.id} value={t.id}>
                      {formatChapterOption(i, t.name)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span className="field-label">Sampai bab</span>
                <select
                  value={form.topicToId}
                  onChange={(e) => setForm({ ...form, topicToId: e.target.value })}
                  className="field-input"
                  required
                >
                  <option value="">Pilih bab akhir</option>
                  {filteredTopics.map((t, i) => (
                    <option key={t.id} value={t.id}>
                      {formatChapterOption(i, t.name)}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}

          {chapterScope ? (
            <p className="md:col-span-2 rounded-xl bg-muted/70 px-3 py-2 text-sm text-muted-foreground">
              Soal akan dibuat untuk <span className="font-medium text-foreground">{chapterScope}</span>
              {selectedChapters.length > 1 ? ` · ${selectedChapters.length} bab` : ""}.
            </p>
          ) : null}
          <label className="field md:col-span-2">
            <span className="field-label">Kesulitan</span>
            <select
              value={form.difficulty}
              onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
              className="field-input"
            >
              <option value="EASY">Mudah</option>
              <option value="MEDIUM">Sedang</option>
              <option value="HARD">Sulit</option>
            </select>
          </label>
        </div>

        <div className="mt-5 rounded-2xl border border-border p-4">
          <p className="text-sm font-semibold">Jumlah soal & bobot</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Tentukan jumlah per jenis. Esai/soal cerita bersifat opsional. Bobot dipakai saat hitung skor: benar semua = 100, salah dipotong sesuai bobot soal itu.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <CompositionCard
              title="Pilihan ganda"
              count={form.multipleChoiceCount}
              weight={form.multipleChoiceWeight}
              onCount={(multipleChoiceCount) => setForm({ ...form, multipleChoiceCount })}
              onWeight={(multipleChoiceWeight) => setForm({ ...form, multipleChoiceWeight })}
            />
            <CompositionCard
              title="Isian singkat"
              count={form.shortAnswerCount}
              weight={form.shortAnswerWeight}
              onCount={(shortAnswerCount) => setForm({ ...form, shortAnswerCount })}
              onWeight={(shortAnswerWeight) => setForm({ ...form, shortAnswerWeight })}
            />
            <CompositionCard
              title="Esai / soal cerita"
              optional
              count={form.essayCount}
              weight={form.essayWeight}
              onCount={(essayCount) => setForm({ ...form, essayCount })}
              onWeight={(essayWeight) => setForm({ ...form, essayWeight })}
            />
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Total {form.multipleChoiceCount + form.shortAnswerCount + form.essayCount} soal
            {compositionPreview(form)}
          </p>
        </div>
        {error ? <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
        <Button type="submit" className="mt-5" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {loading ? "Sedang membuat soal..." : "Generate soal"}
        </Button>
      </form>

      {drafts.length > 0 ? (
        <section className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Draf soal</h2>
              <p className="text-sm text-muted-foreground">
                {drafts.length} soal siap ditinjau. Simpan ke bank soal sebelum dikerjakan di halaman Soal.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" type="button" onClick={() => void handleSaveAll()} disabled={savingAll || allSaved}>
                {savingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {allSaved ? "Semua tersimpan" : "Simpan semua"}
              </Button>
              {allSaved ? (
                <Button asChild>
                  <Link href={practicePath}>Kerjakan di halaman Soal</Link>
                </Button>
              ) : null}
            </div>
          </div>
          {drafts.map((draft, i) => {
            const saved = savedIndexes.includes(i);
            const type = draftType(draft);
            return (
              <article key={i} className="surface p-5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Soal {i + 1}</p>
                    <Badge tone="brand">{questionTypeLabel(type)}</Badge>
                    <Badge>Bobot {draftWeight(draft)}</Badge>
                    {draft.topic ? <Badge>{draft.topic}</Badge> : null}
                  </div>
                  {saved ? <Badge tone="success">Tersimpan</Badge> : <Badge>Draf</Badge>}
                </div>
                <p className="font-medium leading-6">{draft.prompt}</p>
                {draft.figureId ? (
                  <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-muted/40">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/figures/${draft.figureId}`}
                      alt="Gambar soal"
                      className="mx-auto max-h-56 w-auto object-contain"
                    />
                  </div>
                ) : null}
                <div className="mt-4 rounded-2xl border border-dashed border-border p-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">Gambar soal (opsional)</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Unggah file, gambar dengan pena/stylus, atau pilih crop dari dokumen referensi.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={saved || uploadingIndex === i}
                        onClick={() => setStylusIndex((prev) => (prev === i ? null : i))}
                        className={cn(
                          "inline-flex items-center gap-2 rounded-xl border bg-background px-3 py-2 text-xs font-medium transition",
                          stylusIndex === i
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-border text-muted-foreground hover:border-primary/40"
                        )}
                      >
                        <PenLine className="h-3.5 w-3.5" />
                        {stylusIndex === i ? "Tutup pena" : "Gambar pena"}
                      </button>
                      <label
                        className={cn(
                          "inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium transition hover:border-primary/40",
                          (saved || uploadingIndex === i) && "pointer-events-none opacity-60"
                        )}
                      >
                        {uploadingIndex === i ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <ImagePlus className="h-3.5 w-3.5" />
                        )}
                        {uploadingIndex === i ? "Mengunggah..." : "Unggah gambar"}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          disabled={saved || uploadingIndex === i}
                          onChange={(e) => {
                            const file = e.target.files?.[0] ?? null;
                            e.target.value = "";
                            void handleUploadFigure(i, file);
                          }}
                        />
                      </label>
                    </div>
                  </div>

                  {stylusIndex === i && !saved ? (
                    <div className="mt-3 rounded-2xl border border-border bg-muted/20 p-3">
                      <StylusSketchPad
                        disabled={uploadingIndex === i}
                        onSave={async (file) => {
                          await handleUploadFigure(i, file);
                        }}
                        saveLabel="Pakai sebagai gambar soal"
                      />
                    </div>
                  ) : null}

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={saved}
                      onClick={() => setDraftFigure(i, null)}
                      className={cn(
                        "rounded-xl border px-3 py-2 text-xs font-medium transition",
                        !draft.figureId
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border text-muted-foreground hover:border-primary/40"
                      )}
                    >
                      Tanpa gambar
                    </button>
                  </div>

                  {form.materialId ? (
                    <div className="mt-3">
                      <p className="text-xs font-medium text-muted-foreground">Dari dokumen referensi</p>
                      {figuresLoading ? (
                        <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" /> Memuat gambar dari dokumen...
                        </p>
                      ) : figuresForDraft(draft).filter((f) => f.pageNumber > 0).length === 0 ? (
                        <p className="mt-2 text-sm text-muted-foreground">
                          Tidak ada region gambar terdeteksi di dokumen. Anda tetap bisa unggah gambar di atas.
                        </p>
                      ) : (
                        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                          {figuresForDraft(draft)
                            .filter((f) => f.pageNumber > 0)
                            .map((fig) => {
                              const selected = draft.figureId === fig.id;
                              return (
                                <button
                                  key={fig.id}
                                  type="button"
                                  disabled={saved}
                                  onClick={() => setDraftFigure(i, fig.id)}
                                  className={cn(
                                    "overflow-hidden rounded-xl border text-left transition",
                                    selected
                                      ? "border-primary ring-2 ring-primary/30"
                                      : "border-border hover:border-primary/40"
                                  )}
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={fig.url}
                                    alt={`Halaman ${fig.pageNumber}`}
                                    className="h-24 w-full bg-muted object-cover"
                                  />
                                  <span className="block px-2 py-1 text-[11px] text-muted-foreground">
                                    Hal. {fig.pageNumber}
                                    {fig.relevance > 0 ? ` · cocok ${Math.round(fig.relevance * 100)}%` : ""}
                                  </span>
                                </button>
                              );
                            })}
                        </div>
                      )}
                    </div>
                  ) : null}

                  {materialFigures.some((f) => f.pageNumber === 0) ? (
                    <div className="mt-3">
                      <p className="text-xs font-medium text-muted-foreground">Unggahan sesi ini</p>
                      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {materialFigures
                          .filter((f) => f.pageNumber === 0)
                          .map((fig) => {
                            const selected = draft.figureId === fig.id;
                            const isStylus = (fig.nearbyText ?? "").startsWith("stylus-sketch");
                            return (
                              <button
                                key={fig.id}
                                type="button"
                                disabled={saved}
                                onClick={() => setDraftFigure(i, fig.id)}
                                className={cn(
                                  "overflow-hidden rounded-xl border text-left transition",
                                  selected
                                    ? "border-primary ring-2 ring-primary/30"
                                    : "border-border hover:border-primary/40"
                                )}
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={fig.url}
                                  alt={isStylus ? "Sketsa pena" : "Unggahan"}
                                  className="h-24 w-full bg-muted object-cover"
                                />
                                <span className="block px-2 py-1 text-[11px] text-muted-foreground">
                                  {isStylus ? "Sketsa pena" : "Unggahan"}
                                </span>
                              </button>
                            );
                          })}
                      </div>
                    </div>
                  ) : null}
                </div>
                {draft.choices ? (
                  <ul className="mt-3 space-y-1.5">
                    {draft.choices.map((c) => (
                      <li
                        key={c.key}
                        className={`rounded-xl px-3 py-2 text-sm ${c.key === draft.correctKey ? "bg-emerald-50 font-medium text-emerald-900" : "bg-muted text-muted-foreground"}`}
                      >
                        {c.key}. {c.text}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {draft.correctText ? (
                  <p className="mt-3 text-sm font-medium text-emerald-800">Jawaban model: {draft.correctText}</p>
                ) : null}
                <p className="mt-3 rounded-xl bg-primary/5 px-3 py-2 text-sm text-foreground">{draft.explanation}</p>
                <Button
                  type="button"
                  variant={saved ? "secondary" : "default"}
                  className="mt-4"
                  disabled={saved}
                  onClick={() => void handleSave(draft, i)}
                >
                  {saved ? "Sudah disimpan" : "Simpan ke bank soal"}
                </Button>
              </article>
            );
          })}
        </section>
      ) : null}
    </div>
  );
}

function compositionPreview(form: {
  multipleChoiceCount: number;
  shortAnswerCount: number;
  essayCount: number;
  multipleChoiceWeight: number;
  shortAnswerWeight: number;
  essayWeight: number;
}) {
  const totalWeight =
    form.multipleChoiceCount * form.multipleChoiceWeight +
    form.shortAnswerCount * form.shortAnswerWeight +
    form.essayCount * form.essayWeight;
  if (totalWeight === 0) return "";
  return ` · total bobot ${totalWeight} (benar semua = 100)`;
}

function scoreLocal(prompt: string, fig: MaterialFigure): number {
  const tokens = prompt
    .toLowerCase()
    .replace(/[^a-z0-9\u00c0-\u024f\s]/gi, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3);
  if (!tokens.length) return fig.relevance;
  const hay = (fig.nearbyText ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\u00c0-\u024f\s]/gi, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3);
  if (!hay.length) return fig.relevance || 0.05;
  const set = new Set(hay);
  let hit = 0;
  for (const t of tokens) if (set.has(t)) hit += 1;
  return Math.max(fig.relevance, hit / tokens.length);
}

function CompositionCard({
  title,
  optional,
  count,
  weight,
  onCount,
  onWeight,
}: {
  title: string;
  optional?: boolean;
  count: number;
  weight: number;
  onCount: (value: number) => void;
  onWeight: (value: number) => void;
}) {
  return (
    <div className="rounded-2xl bg-muted/50 p-3">
      <p className="text-sm font-semibold">
        {title}
        {optional ? <span className="ml-1 font-normal text-muted-foreground">(opsional)</span> : null}
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <label className="field">
          <span className="field-label">Jumlah</span>
          <input
            type="number"
            min={0}
            max={20}
            value={count}
            onChange={(e) => onCount(Math.max(0, Number(e.target.value) || 0))}
            className="field-input"
          />
        </label>
        <label className="field">
          <span className="field-label">Bobot</span>
          <input
            type="number"
            min={1}
            max={100}
            value={weight}
            onChange={(e) => onWeight(Math.max(1, Number(e.target.value) || 1))}
            className="field-input"
          />
        </label>
      </div>
    </div>
  );
}
