import { PageHeader } from "@/components/layout/PageChrome";
import { MaterialLibrary } from "@/components/material/MaterialLibrary";

export default function OrtuMateriPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Materi dokumen"
        description="Unggah PDF atau foto halaman buku anak. AI akan membuat soal dari isi dokumen tersebut."
      />
      <MaterialLibrary generatePath="/ortu/soal/buat" />
    </div>
  );
}
