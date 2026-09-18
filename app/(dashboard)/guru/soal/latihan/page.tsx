import { PageHeader } from "@/components/layout/PageChrome";
import { PracticeQuiz } from "@/components/quiz/PracticeQuiz";

export default function GuruLatihanPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Soal"
        description="Pilih mapel, lalu kerjakan. Kotak pena untuk esai/isian tampil di laptop dan tablet."
      />
      <PracticeQuiz generatePath="/guru/soal/buat" materiPath="/guru/materi" />
    </div>
  );
}
