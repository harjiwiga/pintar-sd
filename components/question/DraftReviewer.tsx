"use client";

import { Button } from "@/components/ui/button";

interface Choice { key: string; text: string }

interface DraftQuestion {
  prompt: string;
  choices?: Choice[];
  correctKey?: string;
  correctText?: string;
  explanation: string;
}

interface DraftReviewerProps {
  drafts: DraftQuestion[];
  onSave: (draft: DraftQuestion, index: number) => void;
  onSaveAll: () => void;
}

export function DraftReviewer({ drafts, onSave, onSaveAll }: DraftReviewerProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{drafts.length} soal draf</h2>
          <p className="text-sm text-muted-foreground">Tinjau sebelum masuk bank soal.</p>
        </div>
        <Button onClick={onSaveAll}>Simpan semua</Button>
      </div>
      {drafts.map((d, i) => (
        <article key={i} className="surface p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Soal {i + 1}</p>
          <p className="mt-2 font-medium">{d.prompt}</p>
          {d.choices?.map((c) => (
            <p key={c.key} className={`mt-1 text-sm ${c.key === d.correctKey ? "font-semibold text-emerald-800" : "text-muted-foreground"}`}>
              {c.key}. {c.text}
            </p>
          ))}
          {d.correctText ? <p className="mt-2 text-sm font-medium text-emerald-800">Jawaban: {d.correctText}</p> : null}
          <p className="mt-3 rounded-xl bg-primary/5 px-3 py-2 text-sm">{d.explanation}</p>
          <Button variant="outline" className="mt-4" onClick={() => onSave(d, i)}>
            Simpan soal ini
          </Button>
        </article>
      ))}
    </div>
  );
}
