"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthShell } from "@/components/layout/AuthShell";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "TEACHER" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    if (!data.success) {
      setError(data.error?.message ?? "Pendaftaran gagal.");
    } else {
      router.push("/login?registered=true");
    }
    setLoading(false);
  }

  return (
    <AuthShell
      title="Buat akun baru"
      subtitle="Untuk guru dan orang tua. Siswa punya halaman daftar tersendiri."
      footer={
        <div className="space-y-2">
          <p>
            Sudah punya akun?{" "}
            <Link href="/login" className="font-semibold text-primary hover:underline">
              Masuk
            </Link>
          </p>
          <p>
            Siswa?{" "}
            <Link href="/register-siswa" className="font-semibold text-primary hover:underline">
              Daftar dengan username & PIN
            </Link>
          </p>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-muted p-1">
          {[
            { id: "TEACHER", label: "Guru" },
            { id: "PARENT", label: "Orang Tua" },
          ].map((role) => (
            <button
              key={role.id}
              type="button"
              onClick={() => setForm({ ...form, role: role.id })}
              className={cn(
                "rounded-xl px-3 py-2 text-sm font-semibold transition",
                form.role === role.id ? "bg-white text-foreground shadow-sm" : "text-muted-foreground"
              )}
            >
              {role.label}
            </button>
          ))}
        </div>
        <label className="field">
          <span className="field-label">Nama lengkap</span>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="field-input"
            required
          />
        </label>
        <label className="field">
          <span className="field-label">Email</span>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="field-input"
            required
          />
        </label>
        <label className="field">
          <span className="field-label">Password</span>
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="field-input"
            minLength={6}
            required
          />
        </label>
        {error ? (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        ) : null}
        <Button type="submit" className="w-full" size="lg" disabled={loading}>
          {loading ? "Mendaftarkan..." : "Buat akun"}
        </Button>
      </form>
    </AuthShell>
  );
}
