import Link from "next/link";
import { School, Users } from "@/components/ui/icons";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EmptyState, PageHeader } from "@/components/layout/PageChrome";
import { CreateClassForm } from "@/components/class/CreateClassForm";

export default async function KelasPage() {
  const session = await auth();
  if (!session?.user) return null;

  const classes = await prisma.classRoom.findMany({
    where: { teacherId: session.user.id },
    include: { _count: { select: { students: true, assignments: true } } },
    orderBy: [{ grade: "asc" }, { name: "asc" }],
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kelas"
        description="Rombongan belajar yang Anda kelola."
      />
      <CreateClassForm />

      {classes.length === 0 ? (
        <EmptyState
          icon={<School className="h-6 w-6" />}
          title="Belum ada kelas"
          description="Buat kelas, bagikan kode kelas, lalu minta murid daftar sendiri."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {classes.map((cls) => (
            <Link key={cls.id} href={`/guru/kelas/${cls.id}`} className="surface p-5 transition hover:-translate-y-0.5 hover:shadow-soft">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">Kelas {cls.grade}</p>
              <h2 className="mt-2 text-lg font-semibold">{cls.name}</h2>
              <div className="mt-4 flex gap-4 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Users className="h-4 w-4" />
                  {cls._count.students} siswa
                </span>
                <span>{cls._count.assignments} tugas</span>
                {cls.joinCode ? (
                  <span className="font-mono text-xs font-semibold text-foreground">{cls.joinCode.slice(0, 3)}-{cls.joinCode.slice(3)}</span>
                ) : null}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
