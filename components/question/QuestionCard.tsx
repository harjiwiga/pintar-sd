"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Choice { key: string; text: string }

interface QuestionCardProps {
  index: number;
  prompt: string;
  type: "MULTIPLE_CHOICE" | "TRUE_FALSE" | "SHORT_ANSWER";
  choices?: Choice[];
  onAnswer: (answer: string) => void;
  isAnswered?: boolean;
  isCorrect?: boolean;
  explanation?: string;
  correctKey?: string;
  correctText?: string;
}

export function QuestionCard({
  index, prompt, type, choices, onAnswer,
  isAnswered, isCorrect, explanation, correctKey, correctText,
}: QuestionCardProps) {
  const [selected, setSelected] = useState("");
  const [shortAnswer, setShortAnswer] = useState("");

  function handleSubmit() {
    if (type === "SHORT_ANSWER") onAnswer(shortAnswer);
    else onAnswer(selected);
  }

  return (
    <div className="surface p-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Soal {index}</p>
      <p className="mt-2 font-display text-xl font-bold leading-7">{prompt}</p>

      {type === "MULTIPLE_CHOICE" && choices ? (
        <div className="mt-5 space-y-2">
          {choices.map((c) => (
            <button
              key={c.key}
              onClick={() => !isAnswered && setSelected(c.key)}
              disabled={isAnswered}
              className={cn(
                "w-full rounded-2xl border px-4 py-3 text-left text-sm font-medium transition",
                isAnswered
                  ? c.key === correctKey
                    ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                    : c.key === selected && !isCorrect
                    ? "border-red-200 bg-red-50 text-red-800"
                    : "border-border text-muted-foreground"
                  : selected === c.key
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border hover:border-primary/40"
              )}
            >
              <span className="mr-2 font-bold">{c.key}.</span>
              {c.text}
            </button>
          ))}
        </div>
      ) : null}

      {type === "TRUE_FALSE" ? (
        <div className="mt-5 grid grid-cols-2 gap-3">
          {["BENAR", "SALAH"].map((opt) => (
            <button
              key={opt}
              onClick={() => !isAnswered && setSelected(opt)}
              disabled={isAnswered}
              className={cn(
                "rounded-2xl border py-3 text-sm font-bold",
                isAnswered
                  ? opt === correctKey
                    ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                    : opt === selected && !isCorrect
                    ? "border-red-200 bg-red-50 text-red-800"
                    : "border-border text-muted-foreground"
                  : selected === opt
                  ? "border-primary bg-primary/10"
                  : "border-border"
              )}
            >
              {opt === "BENAR" ? "Benar" : "Salah"}
            </button>
          ))}
        </div>
      ) : null}

      {type === "SHORT_ANSWER" ? (
        <input
          type="text"
          value={shortAnswer}
          onChange={(e) => setShortAnswer(e.target.value)}
          disabled={isAnswered}
          placeholder="Tulis jawaban di sini"
          className="field-input mt-5"
        />
      ) : null}

      {!isAnswered ? (
        <Button className="mt-5 w-full" size="lg" onClick={handleSubmit} disabled={!selected && !shortAnswer}>
          Lanjut
        </Button>
      ) : (
        <div className={cn("mt-5 rounded-2xl p-4", isCorrect ? "bg-emerald-50" : "bg-red-50")}>
          <p className={cn("font-semibold", isCorrect ? "text-emerald-800" : "text-red-800")}>
            {isCorrect ? "Jawaban benar" : "Belum tepat"}
          </p>
          {explanation ? <p className="mt-1 text-sm text-foreground">{explanation}</p> : null}
          {!isCorrect && correctText ? (
            <p className="mt-2 text-sm font-medium text-emerald-800">Jawaban yang benar: {correctText}</p>
          ) : null}
        </div>
      )}
    </div>
  );
}
