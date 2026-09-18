"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";

export function CreateClassForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [grade, setGrade] = useState(4);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/classes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, grade }),
    });
    const json = await res.json();
    setLoading(false);
    if (!json.success) {
      setError(json.error?.message ?? "Gagal membuat kelas.");
      return;
    }
    setOpen(false);
    setName("");
    router.push(`/guru/kelas/${json.data.id}`);
    router.refresh();
  }

  if (!open) {
    return (
      <Button type="button" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Buat kelas
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="surface flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
      <label className="field min-w-[12rem]">
        <span className="field-label">Nama kelas</span>
        <input
          className="field-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Kelas 4A"
          required
        />
      </label>
      <label className="field w-28">
        <span className="field-label">Kelas</span>
        <select className="field-input" value={grade} onChange={(e) => setGrade(Number(e.target.value))}>
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>
      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Menyimpan..." : "Simpan"}
        </Button>
        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
          Batal
        </Button>
      </div>
      {error ? <p className="text-sm text-red-700 sm:col-span-full">{error}</p> : null}
    </form>
  );
}
