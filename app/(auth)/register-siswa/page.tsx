"use client";

import { useMemo, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthShell } from "@/components/layout/AuthShell";
import { Button } from "@/components/ui/button";
import { suggestUsername } from "@/lib/studentAccount";

export default function RegisterSiswaPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [grade, setGrade] = useState(4);
  const [username, setUsername] = useState("");
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const suggested = useMemo(() => (name.trim() ? suggestUsername(name, grade) : ""), [name, grade]);

  function handleNameChange(value: string) {
    setName(value);
    if (!usernameTouched) setUsername(value.trim() ? suggestUsername(value, grade) : "");
  }

  function handleGradeChange(value: number) {
    setGrade(value);
    if (!usernameTouched && name.trim()) setUsername(suggestUsername(name, value));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (pin !== pinConfirm) {
      setError("PIN konfirmasi tidak sama.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/auth/register-siswa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        grade,
        username,
        pin,
        joinCode: joinCode.trim() || undefined,
      }),
    });
    const data = await res.json();
    if (!data.success) {
      setError(data.error?.message ?? "Pendaftaran gagal.");
      setLoading(false);
      return;
    }

    const login = await signIn("student", { username: data.data.username, pin, redirect: false });
    if (login?.error) {
      router.push("/login-siswa?registered=true");
      setLoading(false);
      return;
    }
    router.push("/siswa");
    router.refresh();
  }

  return (
    <AuthShell
      highlight="student"
      title="Daftar sebagai siswa"
      subtitle="Buat username dan PIN 4 angka. Kalau guru sudah kasih kode kelas, isi supaya tugas langsung muncul."
      footer={
        <div className="space-y-2">
          <p>
            Sudah punya akun?{" "}
            <Link href="/login-siswa" className="font-semibold text-primary hover:underline">
              Masuk
            </Link>
          </p>
          <p>
            Guru atau orang tua?{" "}
            <Link href="/register" className="font-semibold text-primary hover:underline">
              Daftar di sini
            </Link>
          </p>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="field">
          <span className="field-label">Nama lengkap</span>
          <input
            className="field-input"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Budi Santoso"
            required
          />
        </label>
        <label className="field">
          <span className="field-label">Kelas</span>
          <select className="field-input" value={grade} onChange={(e) => handleGradeChange(Number(e.target.value))}>
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>
                Kelas {n} SD
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field-label">Username</span>
          <input
            className="field-input"
            value={username}
            onChange={(e) => {
              setUsernameTouched(true);
              setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
            }}
            placeholder={suggested || "budi-k4"}
            required
            minLength={3}
          />
          <span className="text-xs text-muted-foreground">Huruf kecil, tanpa spasi. Contoh: budi-k4</span>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="field">
            <span className="field-label">PIN 4 angka</span>
            <input
              type="password"
              className="field-input text-center tracking-[0.3em]"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="••••"
              inputMode="numeric"
              maxLength={4}
              required
            />
          </label>
          <label className="field">
            <span className="field-label">Ulangi PIN</span>
            <input
              type="password"
              className="field-input text-center tracking-[0.3em]"
              value={pinConfirm}
              onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="••••"
              inputMode="numeric"
              maxLength={4}
              required
            />
          </label>
        </div>
        <label className="field">
          <span className="field-label">Kode kelas (opsional)</span>
          <input
            className="field-input uppercase tracking-[0.2em]"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 7))}
            placeholder="ABC-123"
          />
          <span className="text-xs text-muted-foreground">Boleh dikosongkan. Bisa gabung kelas nanti.</span>
        </label>
        {error ? <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
        <Button type="submit" className="w-full" size="lg" disabled={loading || pin.length !== 4}>
          {loading ? "Mendaftarkan..." : "Buat akun siswa"}
        </Button>
      </form>
    </AuthShell>
  );
}
