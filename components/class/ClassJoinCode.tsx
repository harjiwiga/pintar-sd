"use client";

import { useState } from "react";
import { formatJoinCode } from "@/lib/studentAccount";
import { Button } from "@/components/ui/button";

export function ClassJoinCode({ joinCode }: { joinCode: string }) {
  const [copied, setCopied] = useState(false);
  const display = formatJoinCode(joinCode);

  async function copy() {
    await navigator.clipboard.writeText(display);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="surface flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-semibold text-primary">Kode kelas</p>
        <p className="mt-1 font-display text-3xl font-bold tracking-[0.18em]">{display}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Berikan ke murid. Mereka daftar di halaman siswa, lalu masukkan kode ini.
        </p>
      </div>
      <Button type="button" variant="outline" onClick={() => void copy()}>
        {copied ? "Tersalin" : "Salin kode"}
      </Button>
    </div>
  );
}
