"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function JoinClassForm() {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/siswa/join-class", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ joinCode }),
    });
    const json = await res.json();
    setLoading(false);
    if (!json.success) {
      setError(json.error?.message ?? "Kode kelas tidak valid.");
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
      <label className="field flex-1">
        <span className="field-label">Kode dari guru</span>
        <input
          className="field-input uppercase tracking-[0.2em]"
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 7))}
          placeholder="ABC-123"
          required
        />
      </label>
      <Button type="submit" disabled={loading || joinCode.replace(/-/g, "").length < 6}>
        {loading ? "Memeriksa..." : "Gabung kelas"}
      </Button>
      {error ? <p className="text-sm text-red-700 sm:col-span-full">{error}</p> : null}
    </form>
  );
}
