import Link from "next/link";
import { BookOpen, ClipboardList, FileUp, PenLine, Sparkles, Users } from "@/components/ui/icons";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageChrome";

export default async function GuruDashboardPage() {
  const session = await auth();
  if (!session?.user) return null;

  const [classCount, questionCount, assignmentCount] = await Promise.all([
    prisma.classRoom.count({ where: { teacherId: session.user.id } }),
    prisma.question.count({ where: { createdById: session.user.id } }),
    prisma.assignment.count({ where: { classRoom: { teacherId: session.user.id } } }),
  ]);

  const firstName = session.user.name?.split(" ")[0] ?? "Guru";

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Selamat datang, ${firstName}`}
        description="Kelola kelas, bank soal, dan penugasan dari satu tempat."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <StatCard href="/guru/kelas" label="Kelas" value={classCount} hint="Rombongan belajar" />
        <StatCard href="/guru/soal" label="Soal tersimpan" value={questionCount} hint="Siap ditugaskan" />
        <StatCard href="/guru/tugas" label="Penugasan" value={assignmentCount} hint="Latihan ke kelas" />
      </div>

      <section className="surface p-6">
        <h2 className="text-base font-semibold">Mulai cepat</h2>
        <p className="mt-1 text-sm text-muted-foreground">Alur yang paling sering dipakai guru.</p>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <ActionCard
            href="/guru/materi"
            icon={<FileUp className="h-5 w-5" />}
            title="Unggah materi"
            desc="PDF atau foto buku/LKS. AI membaca isinya lalu membuat soal."
          />
          <ActionCard
            href="/guru/soal/buat"
            icon={<Sparkles className="h-5 w-5" />}
            title="Buat soal dengan AI"
            desc="Pilih dokumen atau topik. Tinjau dulu sebelum simpan."
          />
          <ActionCard
            href="/guru/soal/latihan"
            icon={<PenLine className="h-5 w-5" />}
            title="Lembar Soal"
            desc="Pilihan ganda dan esai, plus tombol hitung skor dan koreksi."
          />
          <ActionCard
            href="/guru/kelas"
            icon={<Users className="h-5 w-5" />}
            title="Kelola kelas"
            desc="Tambah rombongan belajar dan profil siswa tanpa email."
          />
          <ActionCard
            href="/guru/tugas/buat"
            icon={<ClipboardList className="h-5 w-5" />}
            title="Buat penugasan"
            desc="Kirim paket latihan ke kelas, dengan tenggat opsional."
          />
          <ActionCard
            href="/guru/soal"
            icon={<BookOpen className="h-5 w-5" />}
            title="Buka bank soal"
            desc="Cari, edit, dan pakai ulang soal yang sudah ditinjau."
          />
        </div>
      </section>
    </div>
  );
}

function StatCard({
  href,
  label,
  value,
  hint,
}: {
  href: string;
  label: string;
  value: number;
  hint: string;
}) {
  return (
    <Link href={href} className="surface group p-5 transition hover:-translate-y-0.5 hover:shadow-soft">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground group-hover:text-primary">{hint}</p>
    </Link>
  );
}

function ActionCard({
  href,
  icon,
  title,
  desc,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <Link href={href} className="flex gap-3 rounded-2xl border border-border p-4 transition hover:border-primary/30 hover:bg-primary/5">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </span>
      <span>
        <span className="block font-semibold">{title}</span>
        <span className="mt-0.5 block text-sm text-muted-foreground">{desc}</span>
      </span>
    </Link>
  );
}
