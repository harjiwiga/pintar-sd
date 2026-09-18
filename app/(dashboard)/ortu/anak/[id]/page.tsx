import Link from "next/link";
import { ArrowLeft } from "@/components/ui/icons";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EmptyState, PageHeader } from "@/components/layout/PageChrome";
import { Badge } from "@/components/ui/badge";

export default async function AnakDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) return null;

  const { id } = await params;
  const child = await prisma.studentProfile.findFirst({
    where: { id, parentId: session.user.id },
  });
  if (!child) notFound();

  const submissions = await prisma.submission.findMany({
    where: { studentId: id, submittedAt: { not: null } },
    include: {
      assignment: { select: { title: true, dueDate: true } },
      answers: true,
    },
    orderBy: { submittedAt: "desc" },
  });

  const scores = submissions.map((s) => s.score).filter((s): s is number => s != null);
  const avgScore =
    scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

  return (
    <div className="space-y-6">
      <Link href="/ortu/anak" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
        <ArrowLeft className="h-4 w-4" />
        Semua anak
      </Link>

      <PageHeader
        title={child.name}
        description={`Kelas ${child.grade} SD · ${child.username}`}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="surface p-5">
          <p className="text-sm text-muted-foreground">Rata-rata nilai</p>
          <p className="mt-2 text-3xl font-semibold">{avgScore != null ? `${avgScore}%` : "—"}</p>
        </div>
        <div className="surface p-5">
          <p className="text-sm text-muted-foreground">Latihan selesai</p>
          <p className="mt-2 text-3xl font-semibold">{submissions.length}</p>
        </div>
      </div>

      <section>
        <h2 className="mb-3 text-base font-semibold">Riwayat latihan</h2>
        {submissions.length === 0 ? (
          <EmptyState
            icon={<span className="text-lg">—</span>}
            title="Belum ada latihan selesai"
            description="Nilai akan muncul setelah anak menyelesaikan tugas dari guru."
          />
        ) : (
          <div className="space-y-2">
            {submissions.map((s) => (
              <div key={s.id} className="surface flex items-center justify-between p-4">
                <div>
                  <p className="font-medium">{s.assignment.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {s.submittedAt?.toLocaleDateString("id-ID")} · {s.answers.filter((a) => a.isCorrect).length}/{s.answers.length} benar
                  </p>
                </div>
                <Badge tone={(s.score ?? 0) >= 70 ? "success" : "warning"}>{s.score ?? 0}%</Badge>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
