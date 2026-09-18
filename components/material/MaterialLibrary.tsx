"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { BookOpen, FileText, Image as ImageIcon, Loader2, Trash2, UploadCloud } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/layout/PageChrome";
import { cn } from "@/lib/utils";

export interface MaterialItem {
  id: string;
  fileName: string;
  mimeType: string;
  subject: string | null;
  grade: number | null;
  status: "PROCESSING" | "READY" | "FAILED";
  createdAt: string;
  chunkCount: number;
  excerpt?: string | null;
  isOwner?: boolean;
  uploadedByName?: string;
  uploadedByRole?: string;
}

export function MaterialLibrary({ generatePath }: { generatePath: string }) {
  const [items, setItems] = useState<MaterialItem[] | null>(null);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [subject, setSubject] = useState("");
  const [grade, setGrade] = useState("");
  const [filter, setFilter] = useState<"all" | "mine" | "shared">("all");
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/materials");
    const data = await res.json();
    if (data.success) setItems(data.data);
    else setError(data.error?.message ?? "Gagal memuat dokumen.");
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => {
    if (!items) return [];
    if (filter === "mine") return items.filter((item) => item.isOwner);
    if (filter === "shared") return items.filter((item) => !item.isOwner && item.status === "READY");
    return items;
  }, [items, filter]);

  async function uploadFile(file: File) {
    setUploading(true);
    setError("");
    setInfo("");
    const form = new FormData();
    form.append("file", file);
    if (subject) form.append("subject", subject);
    if (grade) form.append("grade", grade);

    const res = await fetch("/api/materials", { method: "POST", body: form });
    const data = await res.json();
    if (!data.success) {
      setError(data.error?.message ?? "Gagal mengunggah dokumen.");
    } else if (data.data?.reused) {
      setInfo(
        data.data.message ??
          "Dokumen sudah ada di sistem. Tidak dibuat salinan baru — pilih dari pustaka bersama."
      );
      setFilter("all");
    } else {
      setInfo("Dokumen berhasil diunggah ke pustaka bersama.");
    }
    await load();
    setUploading(false);
  }

  async function remove(id: string) {
    if (!confirm("Hapus dokumen ini dari pustaka bersama? Pengguna lain tidak bisa memakai lagi.")) return;
    const res = await fetch(`/api/materials/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!data.success) {
      setError(data.error?.message ?? "Gagal menghapus dokumen.");
      return;
    }
    await load();
  }

  return (
    <div className="space-y-6">
      <section className="surface p-6">
        <div className="mb-4 rounded-2xl bg-primary/5 px-4 py-3 text-sm text-foreground">
          Dokumen yang sama (isi file identik) tidak disimpan ulang. Guru dan orang tua saling melihat pustaka referensi yang sudah siap.
        </div>
        <div className="mb-4 grid gap-4 sm:grid-cols-2">
          <label className="field">
            <span className="field-label">Mata pelajaran (opsional)</span>
            <input
              className="field-input"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Misalnya IPAS"
            />
          </label>
          <label className="field">
            <span className="field-label">Kelas (opsional)</span>
            <select className="field-input" value={grade} onChange={(e) => setGrade(e.target.value)}>
              <option value="">Semua / tidak diisi</option>
              {[1, 2, 3, 4, 5, 6].map((g) => (
                <option key={g} value={g}>
                  Kelas {g} SD
                </option>
              ))}
            </select>
          </label>
        </div>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files[0];
            if (file) void uploadFile(file);
          }}
          disabled={uploading}
          className={cn(
            "flex w-full flex-col items-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition",
            dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-muted/40",
            uploading && "pointer-events-none opacity-70"
          )}
        >
          {uploading ? (
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          ) : (
            <UploadCloud className="h-8 w-8 text-primary" />
          )}
          <p className="mt-3 font-semibold">
            {uploading ? "Sedang mengekstrak teks dokumen..." : "Seret PDF atau foto materi ke sini"}
          </p>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            PDF, JPG, PNG, atau WEBP. Maksimal 20 MB. Jika file sudah pernah diunggah siapa pun, sistem memakai yang sudah ada.
          </p>
          <span className="mt-4 inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            PDF · JPG · PNG · WEBP
          </span>
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void uploadFile(file);
            e.target.value = "";
          }}
        />
        {error ? <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
        {info ? <p className="mt-4 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{info}</p> : null}
      </section>

      <div className="flex flex-wrap gap-2">
        {(
          [
            { id: "all", label: "Semua referensi" },
            { id: "shared", label: "Dari pengguna lain" },
            { id: "mine", label: "Unggahan saya" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilter(tab.id)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-semibold transition",
              filter === tab.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {items === null ? (
        <div className="surface flex items-center justify-center py-12 text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Memuat dokumen...
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="h-6 w-6" />}
          title={filter === "shared" ? "Belum ada referensi bersama" : "Belum ada dokumen"}
          description={
            filter === "shared"
              ? "Saat guru atau orang tua lain mengunggah buku, daftarnya muncul di sini."
              : "Unggah PDF pelajaran atau foto halaman buku, lalu generate soal dari isinya."
          }
        />
      ) : (
        <div className="grid gap-3">
          {visible.map((item) => (
            <article
              key={item.id}
              className="surface flex flex-col gap-4 p-5 min-[800px]:flex-row min-[800px]:items-start min-[800px]:justify-between"
            >
              <div className="flex gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  {item.mimeType.includes("pdf") ? <FileText className="h-5 w-5" /> : <ImageIcon className="h-5 w-5" />}
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold leading-6">{item.fileName}</h2>
                    <StatusBadge status={item.status} />
                    {item.isOwner ? (
                      <Badge tone="brand">Unggahan saya</Badge>
                    ) : (
                      <Badge>
                        {item.uploadedByRole ?? "Pengguna"} · {item.uploadedByName ?? "Lain"}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {item.subject ? `${item.subject} · ` : ""}
                    {item.grade ? `Kelas ${item.grade} · ` : ""}
                    {item.chunkCount} potongan materi ·{" "}
                    {new Date(item.createdAt).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                  {item.excerpt ? (
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{item.excerpt}</p>
                  ) : null}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {item.status === "READY" ? (
                  <Button asChild size="sm">
                    <Link href={`${generatePath}?materialId=${item.id}`}>Pakai untuk soal</Link>
                  </Button>
                ) : null}
                {item.isOwner ? (
                  <Button type="button" variant="outline" size="icon" onClick={() => void remove(item.id)} aria-label="Hapus">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: MaterialItem["status"] }) {
  if (status === "READY") return <Badge tone="success">Siap</Badge>;
  if (status === "FAILED") return <Badge tone="danger">Gagal</Badge>;
  return <Badge tone="warning">Memproses</Badge>;
}
