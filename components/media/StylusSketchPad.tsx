"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Eraser, Loader2, PenLine, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { inkBounds } from "@/lib/handwriting";

type Point = { x: number; y: number; p: number };
type Stroke = Point[];

export function StylusSketchPad({
  disabled,
  className,
  heightClassName = "h-[min(36vh,16rem)] min-h-[200px]",
  onSave,
  saveLabel = "Pakai gambar ini",
}: {
  disabled?: boolean;
  className?: string;
  heightClassName?: string;
  onSave: (file: File) => Promise<void> | void;
  saveLabel?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const currentRef = useRef<Stroke | null>(null);
  const [hasInk, setHasInk] = useState(false);
  const [saving, setSaving] = useState(false);

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
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#111827";
    ctx.fillStyle = "#111827";

    for (const stroke of strokesRef.current) drawStroke(ctx, stroke);
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
      setHasInk(true);
    }
    currentRef.current = null;
    redraw();
  }

  function undo() {
    if (disabled || strokesRef.current.length === 0) return;
    strokesRef.current = strokesRef.current.slice(0, -1);
    setHasInk(strokesRef.current.length > 0);
    redraw();
  }

  function clearInk() {
    if (disabled) return;
    strokesRef.current = [];
    currentRef.current = null;
    setHasInk(false);
    redraw();
  }

  async function handleSave() {
    if (disabled || !hasInk || saving) return;
    const file = exportSketchFile(strokesRef.current);
    if (!file) return;
    setSaving(true);
    try {
      await onSave(file);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          <PenLine className="h-3.5 w-3.5" />
          Gambar dengan pena / stylus
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" onClick={undo} disabled={disabled || !hasInk}>
            <RotateCcw className="h-3.5 w-3.5" />
            Urung
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={clearInk} disabled={disabled || !hasInk}>
            <Eraser className="h-3.5 w-3.5" />
            Hapus
          </Button>
          <Button type="button" size="sm" onClick={() => void handleSave()} disabled={disabled || !hasInk || saving}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PenLine className="h-3.5 w-3.5" />}
            {saving ? "Menyimpan..." : saveLabel}
          </Button>
        </div>
      </div>

      <div
        ref={wrapRef}
        className={cn(
          "relative overflow-hidden rounded-2xl border border-input bg-white",
          heightClassName
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
            Gambar diagram, sketsa, atau tulisan dengan pena/stylus/jari, lalu klik “{saveLabel}”.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function exportSketchFile(strokes: Stroke[]): File | null {
  const bounds = inkBounds(strokes);
  if (!bounds) return null;

  const scale = 2.8;
  const pad = 40;
  const width = Math.min(1400, Math.max(240, Math.round(bounds.width * scale) + pad * 2));
  const height = Math.min(1000, Math.max(180, Math.round(bounds.height * scale) + pad * 2));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#111827";
  ctx.fillStyle = "#111827";

  const ox = pad - bounds.minX * scale;
  const oy = pad - bounds.minY * scale;
  for (const stroke of strokes) {
    drawStroke(
      ctx,
      stroke.map((point) => ({ x: point.x * scale + ox, y: point.y * scale + oy, p: 1 })),
      4.5
    );
  }

  const dataUrl = canvas.toDataURL("image/png");
  const match = /^data:image\/png;base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  const binary = atob(match[1]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], `stylus-sketch-${Date.now()}.png`, { type: "image/png" });
}

function drawStroke(ctx: CanvasRenderingContext2D, stroke: Stroke, minWidth = 2.2) {
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
    ctx.lineWidth = minWidth + ((previous.p + point.p) / 2) * 2.8;
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
  }
}
