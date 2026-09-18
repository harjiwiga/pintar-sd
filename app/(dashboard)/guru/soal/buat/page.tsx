import { Suspense } from "react";
import { PageHeader } from "@/components/layout/PageChrome";
import { GenerateSoalForm } from "@/components/question/GenerateSoalForm";

export default function BuatSoalPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Buat soal dengan AI"
        description="Atur jumlah pilihan ganda, isian, dan esai (opsional) beserta bobotnya. Benar semua bernilai 100."
      />
      <Suspense fallback={<div className="surface p-6 text-sm text-muted-foreground">Menyiapkan formulir...</div>}>
        <GenerateSoalForm materiPath="/guru/materi" practicePath="/guru/soal/latihan" />
      </Suspense>
    </div>
  );
}
