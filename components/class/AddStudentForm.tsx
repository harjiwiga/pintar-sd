"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function AddStudentForm({ classId, defaultGrade }: { classId: string; defaultGrade: number }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<{ name: string; username: string; pin: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch(`/api/classes/${classId}/students`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, grade: defaultGrade, pin }),
    });
    const json = await res.json();
    setLoading(false);
    if (!json.success) {
      setError(json.error?.message ?? "Gagal menambah siswa.");
      return;
    }
    setCreated({ name, username: json.data.username, pin });
    setName("");
    setPin("");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {created ? (
        <div className="rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-950">
          <p className="font-semibold">{created.name} sudah masuk kelas.</p>
          <p className="mt-1">
            Username: <span className="font-mono font-semibold">{created.username}</span>
          </p>
          <p>
            PIN: <span className="font-mono font-semibold">{created.pin}</span>
          </p>
          <p className="mt-2 text-emerald-800">Catat dan berikan ke murid. PIN tidak ditampilkan lagi.</p>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-[1fr_8rem_auto]">
        <label className="field">
          <span className="field-label">Nama siswa</span>
          <input
            className="field-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Budi Santoso"
            required
          />
        </label>
        <label className="field">
          <span className="field-label">PIN 4 angka</span>
          <input
            className="field-input text-center tracking-[0.3em]"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            placeholder="1234"
            inputMode="numeric"
            maxLength={4}
            required
          />
        </label>
        <Button type="submit" className="self-end" disabled={loading || pin.length !== 4}>
          {loading ? "Menyimpan..." : "Tambah"}
        </Button>
      </form>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
