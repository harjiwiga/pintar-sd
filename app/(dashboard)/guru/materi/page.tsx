import { PageHeader } from "@/components/layout/PageChrome";
import { MaterialLibrary } from "@/components/material/MaterialLibrary";

export default function GuruMateriPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Materi dokumen"
        description="Unggah PDF atau foto buku/LKS. Teks diekstrak otomatis, lalu dipakai sebagai sumber soal AI."
      />
      <MaterialLibrary generatePath="/guru/soal/buat" />
    </div>
  );
}
