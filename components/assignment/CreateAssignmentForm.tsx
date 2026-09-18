"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { questionTypeLabel } from "@/lib/questionLabels";
import { cn } from "@/lib/utils";

interface ClassOption {
  id: string;
  name: string;
  grade: number;
}

interface QuestionOption {
  id: string;
  prompt: string;
  type: string;
  weight: number;
  subject: string;
  topic: string;
  grade: number;
}

export function CreateAssignmentForm({
  classes,
  questions,
}: {
  classes: ClassOption[];
  questions: QuestionOption[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [classId, setClassId] = useState(classes[0]?.id ?? "");
  const [dueDate, setDueDate] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const selectedQuestions = useMemo(
    () => questions.filter((question) => selected.includes(question.id)),
    [questions, selected]
  );

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        classId,
        questionIds: selected,
        dueDate: dueDate || undefined,
      }),
    });
    const json = await res.json();
    setLoading(false);
    if (!json.success) {
      setError(json.error?.message ?? "Gagal membuat penugasan.");
      return;
    }
    router.push(`/guru/tugas/${json.data.id}`);
    router.refresh();
  }

  if (classes.length === 0) {
    return (
      <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
        Buat kelas dulu di menu Kelas, lalu kembali ke sini.
      </p>
    );
  }

  if (questions.length === 0) {
    return (
      <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
        Bank soal masih kosong. Generate dan simpan soal dulu.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <label className="field md:col-span-2">
          <span className="field-label">Judul tugas</span>
          <input
            className="field-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Latihan pecahan bab 2"
            required
            minLength={3}
          />
        </label>
        <label className="field">
          <span className="field-label">Kelas</span>
          <select className="field-input" value={classId} onChange={(e) => setClassId(e.target.value)} required>
            {classes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} (Kelas {item.grade})
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field-label">Tenggat (opsional)</span>
          <input className="field-input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </label>
      </div>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="font-semibold">Pilih soal</h2>
            <p className="text-sm text-muted-foreground">{selected.length} soal dipilih</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => setSelected(questions.map((q) => q.id))}>
            Pilih semua
          </Button>
        </div>
        <div className="space-y-2">
          {questions.map((question) => {
            const checked = selected.includes(question.id);
            return (
              <label
                key={question.id}
                className={cn(
                  "surface flex cursor-pointer items-start gap-3 p-4 transition",
                  checked && "ring-2 ring-primary/30"
                )}
              >
                <input type="checkbox" className="mt-1" checked={checked} onChange={() => toggle(question.id)} />
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap gap-2">
                    <Badge tone="brand">{question.subject}</Badge>
                    <Badge>{questionTypeLabel(question.type)}</Badge>
                    <Badge>Kelas {question.grade}</Badge>
                    <Badge>Bobot {question.weight}</Badge>
                  </div>
                  <p className="font-medium leading-6">{question.prompt}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{question.topic}</p>
                </div>
              </label>
            );
          })}
        </div>
      </section>

      {selectedQuestions.length > 0 ? (
        <p className="text-sm text-muted-foreground">
          Total bobot {selectedQuestions.reduce((sum, item) => sum + item.weight, 0)}. Benar semua tetap bernilai 100.
        </p>
      ) : null}

      {error ? <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      <Button type="submit" size="lg" disabled={loading || selected.length === 0}>
        {loading ? "Mengirim..." : "Tugaskan ke kelas"}
      </Button>
    </form>
  );
}
