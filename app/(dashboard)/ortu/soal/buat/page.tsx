import { Suspense } from "react";
import { PageHeader } from "@/components/layout/PageChrome";
import { GenerateSoalForm } from "@/components/question/GenerateSoalForm";

export default function OrtuBuatSoalPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Buat soal dengan AI"
        description="Pilih satu bab atau rentang bab, unggah materi bila ada, lalu tinjau dan simpan sebelum dikerjakan di halaman Soal."
      />
      <Suspense fallback={<div className="surface p-6 text-sm text-muted-foreground">Menyiapkan formulir...</div>}>
        <GenerateSoalForm materiPath="/ortu/materi" practicePath="/ortu/soal" />
      </Suspense>
    </div>
  );
}
