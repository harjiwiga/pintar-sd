import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@/components/ui/icons";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EmptyState, PageHeader } from "@/components/layout/PageChrome";
import { Badge } from "@/components/ui/badge";

export default async function TugasDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return null;

  const { id } = await params;
  const assignment = await prisma.assignment.findFirst({
    where: { id, classRoom: { teacherId: session.user.id } },
    include: {
      classRoom: { include: { students: { orderBy: { name: "asc" } } } },
      questions: { include: { question: true } },
      submissions: {
        include: { student: { select: { id: true, name: true, username: true } } },
        orderBy: { startedAt: "desc" },
      },
    },
  });
  if (!assignment) notFound();

  const latestByStudent = new Map<string, (typeof assignment.submissions)[number]>();
  for (const submission of assignment.submissions) {
    if (!latestByStudent.has(submission.studentId)) {
      latestByStudent.set(submission.studentId, submission);
    }
  }

  return (
    <div className="space-y-6">
      <Link href="/guru/tugas" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
        <ArrowLeft className="h-4 w-4" />
        Semua penugasan
      </Link>

      <PageHeader
        title={assignment.title}
        description={`${assignment.classRoom.name} · ${assignment.questions.length} soal${
          assignment.dueDate ? ` · tenggat ${assignment.dueDate.toLocaleDateString("id-ID")}` : ""
        }`}
      />

      <section className="space-y-3">
        <h2 className="font-semibold">Pengerjaan siswa</h2>
        {assignment.classRoom.students.length === 0 ? (
          <EmptyState
            icon={<span className="text-lg">—</span>}
            title="Belum ada siswa di kelas ini"
            description="Tambahkan siswa di halaman kelas, lalu minta mereka masuk dengan username dan PIN."
          />
        ) : (
          <div className="space-y-2">
            {assignment.classRoom.students.map((student) => {
              const submission = latestByStudent.get(student.id);
              return (
                <div key={student.id} className="surface flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium">{student.name}</p>
                    <p className="text-sm text-muted-foreground">{student.username}</p>
                  </div>
                  {submission?.submittedAt ? (
                    <Badge tone={(submission.score ?? 0) >= 70 ? "success" : "warning"}>
                      Skor {submission.score ?? 0}
                    </Badge>
                  ) : submission ? (
                    <Badge tone="warning">Sedang mengerjakan</Badge>
                  ) : (
                    <Badge>Belum mulai</Badge>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
