"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Eraser, Keyboard, Loader2, PenLine, RotateCcw, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { inkBounds } from "@/lib/handwriting";

type Point = { x: number; y: number; p: number };
type Stroke = Point[];
type Mode = "stylus" | "type";

export type EssayAnswerHandle = {
  recognizeIfNeeded: () => Promise<string>;
  hasContent: () => boolean;
};

export const EssayAnswerInput = forwardRef<
  EssayAnswerHandle,
  {
    value: string;
    onChange: (text: string) => void;
    disabled?: boolean;
    placeholder?: string;
    compact?: boolean;
    onInkChange?: (hasInk: boolean) => void;
  }
>(function EssayAnswerInput({ value, onChange, disabled, placeholder, compact, onInkChange }, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const currentRef = useRef<Stroke | null>(null);
  const [mode, setMode] = useState<Mode>("stylus");
  const [hasInk, setHasInk] = useState(false);
  const [reading, setReading] = useState(false);
  const [ocrHint, setOcrHint] = useState("");

  const notifyInk = useCallback(
    (next: boolean) => {
      setHasInk(next);
      onInkChange?.(next);
    },
    [onInkChange]
  );

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = wrap.clientWidth;
    const height = wrap.clientHeight;
    if (width < 8 || height < 8) return;

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1f2937";

    for (const stroke of strokesRef.current) {
      drawStroke(ctx, stroke);
    }
    if (currentRef.current) drawStroke(ctx, currentRef.current);
  }, []);

  useEffect(() => {
    redraw();
    const wrap = wrapRef.current;
    if (!wrap) return;
    const observer = new ResizeObserver(() => redraw());
    observer.observe(wrap);
    return () => observer.disconnect();
  }, [redraw]);

  function pointFromEvent(event: React.PointerEvent<HTMLCanvasElement>): Point {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0, p: 0.5 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      p: event.pressure > 0 ? event.pressure : 0.55,
    };
  }

  function startStroke(event: React.PointerEvent<HTMLCanvasElement>) {
    if (disabled) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    currentRef.current = [pointFromEvent(event)];
    redraw();
  }

  function moveStroke(event: React.PointerEvent<HTMLCanvasElement>) {
    if (disabled || !currentRef.current) return;
    event.preventDefault();
    currentRef.current.push(pointFromEvent(event));
    redraw();
  }

  function endStroke(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!currentRef.current) return;
    event.preventDefault();
    if (currentRef.current.length > 0) {
      strokesRef.current = [...strokesRef.current, currentRef.current];
      notifyInk(true);
      setOcrHint("");
    }
    currentRef.current = null;
    redraw();
  }

  function undo() {
    if (disabled || strokesRef.current.length === 0) return;
    strokesRef.current = strokesRef.current.slice(0, -1);
    notifyInk(strokesRef.current.length > 0);
    redraw();
  }

  function clearInk() {
    if (disabled) return;
    strokesRef.current = [];
    currentRef.current = null;
    notifyInk(false);
    setOcrHint("");
    redraw();
  }

  function exportImage(): string | null {
    return exportOcrImage(strokesRef.current, Boolean(compact));
  }

  async function recognize(): Promise<string> {
    const image = exportImage();
    if (!image) return value.trim();
    setReading(true);
    setOcrHint("");
    try {
      const res = await fetch("/api/ocr/handwriting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image, singleLine: Boolean(compact) }),
      });
      const json = await res.json();
      if (!json.success) {
        setOcrHint(json.error?.message ?? "Tulisan belum terbaca. Ketik saja di bawah.");
        return value.trim();
      }
      const text = String(json.data?.text ?? "").trim();
      if (!text) {
        setOcrHint("Tulisan belum terbaca. Ketik saja di bawah.");
        return value.trim();
      }
      onChange(text);
      setOcrHint(
        json.data?.source === "vision"
          ? "Hasil bacaan model vision. Periksa sebentar, lalu perbaiki jika perlu."
          : "Hasil Tesseract sering meleset untuk tulisan tangan. Perbaiki teks di bawah, atau aktifkan VISION_API_KEY (Gemini)."
      );
      return text;
    } catch {
      setOcrHint("Gagal membaca tulisan. Ketik saja di bawah.");
      return value.trim();
    } finally {
      setReading(false);
    }
  }

  useImperativeHandle(ref, () => ({
    async recognizeIfNeeded() {
      if (value.trim()) return value.trim();
      if (strokesRef.current.length === 0) return "";
      return recognize();
    },
    hasContent() {
      return value.trim().length > 0 || strokesRef.current.length > 0;
    },
  }));

  return (
    <div className="mt-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded-xl bg-muted p-1">
          <button
            type="button"
            disabled={disabled}
            onClick={() => setMode("stylus")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold",
              mode === "stylus" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground"
            )}
          >
            <PenLine className="h-3.5 w-3.5" />
            Pena
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => setMode("type")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold",
              mode === "type" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground"
            )}
          >
            <Keyboard className="h-3.5 w-3.5" />
            Ketik
          </button>
        </div>
        {mode === "stylus" && !disabled ? (
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={undo} disabled={!hasInk}>
              <RotateCcw className="h-3.5 w-3.5" />
              Urung
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={clearInk} disabled={!hasInk}>
              <Eraser className="h-3.5 w-3.5" />
              Hapus
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => void recognize()} disabled={!hasInk || reading}>
              {reading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Type className="h-3.5 w-3.5" />}
              Ubah jadi tulisan
            </Button>
          </div>
        ) : null}
      </div>

      {mode === "stylus" || hasInk ? (
        <div
          ref={wrapRef}
          className={cn(
            "essay-pad relative overflow-hidden rounded-2xl border border-input",
            compact ? "h-[9.5rem] min-h-[9.5rem]" : "h-[min(42vh,20rem)] min-h-[220px]",
            mode !== "stylus" && "hidden"
          )}
        >
          <canvas
            ref={canvasRef}
            className="absolute inset-0 h-full w-full touch-none"
            style={{ touchAction: "none" }}
            onContextMenu={(event) => event.preventDefault()}
            onPointerDown={startStroke}
            onPointerMove={moveStroke}
            onPointerUp={endStroke}
            onPointerCancel={endStroke}
          />
          {!hasInk && !disabled ? (
            <p className="pointer-events-none absolute inset-x-4 top-4 text-sm text-muted-foreground">
              {compact
                ? "Tulis jawaban singkat dengan pena, mouse, atau jari."
                : "Tulis jawaban dengan pena, mouse, atau jari. Jangan geser halaman saat menekan di kotak ini."}
            </p>
          ) : null}
        </div>
      ) : null}

      <textarea
        rows={compact ? 2 : mode === "type" ? 5 : 3}
        className={cn("field-input h-auto py-3", compact ? "min-h-[72px]" : "min-h-[84px]")}
        placeholder={placeholder ?? "Ketik atau perbaiki hasil bacaan pena..."}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
      {ocrHint ? <p className="text-xs text-muted-foreground">{ocrHint}</p> : null}
    </div>
  );
});

function exportOcrImage(strokes: Stroke[], compact: boolean): string | null {
  const bounds = inkBounds(strokes);
  if (!bounds) return null;

  const scale = compact ? 4.2 : 3.4;
  const pad = 56;
  const width = Math.min(1600, Math.max(160, Math.round(bounds.width * scale) + pad * 2));
  const height = Math.min(900, Math.max(compact ? 120 : 180, Math.round(bounds.height * scale) + pad * 2));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#000000";
  ctx.fillStyle = "#000000";

  const ox = pad - bounds.minX * scale;
  const oy = pad - bounds.minY * scale;
  for (const stroke of strokes) {
    drawStroke(
      ctx,
      stroke.map((point) => ({ x: point.x * scale + ox, y: point.y * scale + oy, p: 1 })),
      compact ? 7.5 : 6.2
    );
  }

  return canvas.toDataURL("image/png");
}

function drawStroke(ctx: CanvasRenderingContext2D, stroke: Stroke, minWidth = 1.6) {
  if (stroke.length === 0) return;
  if (stroke.length === 1) {
    const point = stroke[0];
    ctx.beginPath();
    ctx.arc(point.x, point.y, minWidth / 2 + point.p, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  for (let i = 1; i < stroke.length; i += 1) {
    const previous = stroke[i - 1];
    const point = stroke[i];
    ctx.beginPath();
    ctx.moveTo(previous.x, previous.y);
    ctx.lineWidth = minWidth + ((previous.p + point.p) / 2) * (minWidth > 4 ? 2 : 3.4);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
  }
}
