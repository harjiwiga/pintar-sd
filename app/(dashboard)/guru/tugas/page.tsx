import Link from "next/link";
import { ClipboardList } from "@/components/ui/icons";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EmptyState, PageHeader } from "@/components/layout/PageChrome";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function TugasPage() {
  const session = await auth();
  if (!session?.user) return null;

  const assignments = await prisma.assignment.findMany({
    where: { classRoom: { teacherId: session.user.id } },
    include: {
      classRoom: true,
      _count: { select: { questions: true, submissions: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Penugasan"
        description="Paket latihan yang sudah dikirim ke kelas."
        actions={
          <Button asChild>
            <Link href="/guru/tugas/buat">Buat penugasan</Link>
          </Button>
        }
      />

      {assignments.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="h-6 w-6" />}
          title="Belum ada penugasan"
          description="Simpan soal ke bank soal, lalu tugaskan ke kelas."
          action={
            <Button asChild>
              <Link href="/guru/tugas/buat">Buat penugasan pertama</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {assignments.map((a) => (
            <Link key={a.id} href={`/guru/tugas/${a.id}`} className="surface flex items-center justify-between p-5 transition hover:shadow-soft">
              <div>
                <h2 className="font-semibold">{a.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {a.classRoom.name} · {a._count.questions} soal
                </p>
              </div>
              <Badge>{a._count.submissions} pengerjaan</Badge>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
