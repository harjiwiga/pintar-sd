import Link from "next/link";
import { WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function OfflineFallbackPage() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-800">
        <WifiOff className="h-6 w-6" />
      </span>
      <h1 className="font-display text-2xl font-bold">Sedang offline</h1>
      <p className="text-sm text-muted-foreground">
        Halaman ini belum tersimpan di perangkat. Buka dulu saat online, atau lanjut ke latihan pribadi yang sudah
        disimpan offline.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button asChild>
          <Link href="/guru/soal/latihan">Latihan (guru)</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/ortu/soal">Latihan (ortu)</Link>
        </Button>
      </div>
    </main>
  );
}
