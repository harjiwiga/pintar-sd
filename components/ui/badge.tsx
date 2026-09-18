import { cn } from "@/lib/utils";

export function Badge({
  children,
  className,
  tone = "neutral",
}: {
  children: React.ReactNode;
  className?: string;
  tone?: "neutral" | "success" | "warning" | "danger" | "brand";
}) {
  const tones = {
    neutral: "bg-muted text-muted-foreground",
    success: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100",
    warning: "bg-amber-50 text-amber-800 ring-1 ring-amber-100",
    danger: "bg-red-50 text-red-700 ring-1 ring-red-100",
    brand: "bg-primary/10 text-primary ring-1 ring-primary/15",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

export function difficultyTone(difficulty: string) {
  if (difficulty === "EASY") return "success" as const;
  if (difficulty === "HARD") return "danger" as const;
  return "warning" as const;
}

export function difficultyLabel(difficulty: string) {
  if (difficulty === "EASY") return "Mudah";
  if (difficulty === "HARD") return "Sulit";
  return "Sedang";
}
