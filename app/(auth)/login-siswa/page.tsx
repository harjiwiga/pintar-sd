"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { AuthShell } from "@/components/layout/AuthShell";
import { Button } from "@/components/ui/button";

function LoginSiswaForm() {
  const router = useRouter();
  const params = useSearchParams();
  const registered = params.get("registered") === "true";
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("student", {
      username,
      pin,
      redirect: false,
    });

    if (result?.error) {
      setError("Username atau PIN salah.");
    } else {
      router.push("/siswa");
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <AuthShell
      highlight="student"
      title="Halo, ayo mulai latihan"
      subtitle="Masukkan username dan PIN 4 angka. Kalau belum punya, daftar dulu."
      footer={
        <div className="space-y-2">
          <p>
            Belum punya akun?{" "}
            <Link href="/register-siswa" className="font-semibold text-primary hover:underline">
              Daftar sebagai siswa
            </Link>
          </p>
          <p>
            <Link href="/login" className="font-semibold text-primary hover:underline">
              Masuk sebagai guru atau orang tua
            </Link>
          </p>
        </div>
      }
    >
      {registered ? (
        <div className="mb-4 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Akun siswa sudah dibuat. Silakan masuk dengan username dan PIN.
        </div>
      ) : null}
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="field">
          <span className="field-label">Username</span>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="field-input text-base"
            placeholder="contoh: budi-kelas4a"
            required
          />
        </label>
        <label className="field">
          <span className="field-label">PIN</span>
          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            className="field-input text-center font-display text-2xl tracking-[0.4em]"
            placeholder="••••"
            maxLength={4}
            inputMode="numeric"
            required
          />
        </label>
        {error ? <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
        <Button type="submit" className="w-full" size="lg" disabled={loading || pin.length !== 4}>
          {loading ? "Membuka..." : "Mulai belajar"}
        </Button>
      </form>
    </AuthShell>
  );
}

export default function LoginSiswaPage() {
  return (
    <Suspense>
      <LoginSiswaForm />
    </Suspense>
  );
}
