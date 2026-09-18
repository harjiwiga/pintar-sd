import { FileUp, PenLine, Sparkles, UsersRound } from "@/components/ui/icons";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ChildRow } from "@/components/parent/ChildRow";
import { EmptyState, PageHeader } from "@/components/layout/PageChrome";
import Link from "next/link";

export default async function OrtuDashboardPage() {
  const session = await auth();
  if (!session?.user) return null;

  const children = await prisma.studentProfile.findMany({
    where: { parentId: session.user.id },
    include: { _count: { select: { submissions: true } } },
  });

  const firstName = session.user.name?.split(" ")[0] ?? "Orang Tua";

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Halo, ${firstName}`}
        description="Unggah materi, buat soal bersama AI, lalu hitung skor latihan anak."
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <Link href="/ortu/materi" className="surface flex gap-3 p-4 transition hover:shadow-soft">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <FileUp className="h-5 w-5" />
          </span>
          <span>
            <span className="block font-semibold">Unggah materi</span>
            <span className="mt-0.5 block text-sm text-muted-foreground">PDF atau foto buku anak.</span>
          </span>
        </Link>
        <Link href="/ortu/soal/buat" className="surface flex gap-3 p-4 transition hover:shadow-soft">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Sparkles className="h-5 w-5" />
          </span>
          <span>
            <span className="block font-semibold">Buat soal AI</span>
            <span className="mt-0.5 block text-sm text-muted-foreground">Dari dokumen atau topik.</span>
          </span>
        </Link>
        <Link href="/ortu/soal" className="surface flex gap-3 p-4 transition hover:shadow-soft">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <PenLine className="h-5 w-5" />
          </span>
          <span>
            <span className="block font-semibold">Lembar Soal</span>
            <span className="mt-0.5 block text-sm text-muted-foreground">PG & esai, plus skor.</span>
          </span>
        </Link>
      </div>

      {children.length === 0 ? (
        <EmptyState
          icon={<UsersRound className="h-6 w-6" />}
          title="Belum ada profil anak"
          description="Minta guru menambahkan anak ke kelas, lalu hubungkan ke akun Anda."
        />
      ) : (
        <div className="grid gap-4">
          {children.map((child) => (
            <ChildRow
              key={child.id}
              href={`/ortu/anak/${child.id}`}
              name={child.name}
              grade={child.grade}
              count={child._count.submissions}
            />
          ))}
        </div>
      )}
    </div>
  );
}
