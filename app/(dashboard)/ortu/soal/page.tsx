import { PageHeader } from "@/components/layout/PageChrome";
import { PracticeQuiz } from "@/components/quiz/PracticeQuiz";

export default function OrtuSoalPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Soal"
        description="Pilih mapel, lalu kerjakan. Kotak pena untuk esai/isian tampil di laptop dan tablet — bukan hanya di tablet."
      />
      <PracticeQuiz generatePath="/ortu/soal/buat" materiPath="/ortu/materi" />
    </div>
  );
}
