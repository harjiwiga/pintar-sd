import Link from "next/link";
import { redirect } from "next/navigation";
import { ClipboardList, PartyPopper } from "@/components/ui/icons";
import { EmptyState } from "@/components/layout/PageChrome";
import { Badge } from "@/components/ui/badge";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireStudentProfileId } from "@/lib/session";
import { JoinClassForm } from "@/components/student/JoinClassForm";

export default async function SiswaDashboardPage() {
  const session = await auth();
  const studentId = requireStudentProfileId(session);
  if (!studentId) redirect("/login-siswa");

  const student = await prisma.studentProfile.findUnique({
    where: { id: studentId },
    include: { classRoom: true },
  });

  const assignments = student?.classId
    ? await prisma.assignment.findMany({
        where: { classId: student.classId },
        include: {
          _count: { select: { questions: true } },
          submissions: {
            where: { studentId },
            select: { id: true, score: true, submittedAt: true },
            orderBy: { startedAt: "desc" },
            take: 1,
          },
        },
        orderBy: { createdAt: "desc" },
      })
    : [];

  return (
    <div className="space-y-6">
      <div className="surface overflow-hidden p-6">
        <p className="text-sm font-semibold text-primary">Selamat datang</p>
        <h1 className="mt-1 font-display text-3xl font-bold">Halo, {student?.name ?? "Siswa"}</h1>
        <p className="mt-2 text-muted-foreground">
          {student?.classRoom
            ? `${student.classRoom.name} · kerjakan tugas dari gurumu.`
            : "Belum masuk kelas. Minta kode kelas ke guru, lalu gabung di bawah."}
        </p>
        {!student?.classRoom ? <JoinClassForm /> : null}
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Tugas latihan</h2>
        {assignments.length === 0 ? (
          <EmptyState
            icon={<PartyPopper className="h-6 w-6" />}
            title="Belum ada tugas baru"
            description="Kalau guru sudah memberi latihan, daftarnya akan muncul di sini."
          />
        ) : (
          assignments.map((assignment) => {
            const submission = assignment.submissions[0];
            const done = Boolean(submission?.submittedAt);
            return (
              <Link
                key={assignment.id}
                href={`/siswa/latihan/${assignment.id}`}
                className="surface flex items-center justify-between p-4 transition hover:shadow-soft"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <ClipboardList className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-semibold">{assignment.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {assignment._count.questions} soal
                      {assignment.dueDate
                        ? ` · tenggat ${assignment.dueDate.toLocaleDateString("id-ID")}`
                        : ""}
                    </p>
                  </div>
                </div>
                {done ? (
                  <Badge tone={(submission?.score ?? 0) >= 70 ? "success" : "warning"}>
                    Skor {submission?.score ?? 0}
                  </Badge>
                ) : (
                  <span className="text-sm font-semibold text-primary">{submission ? "Lanjutkan" : "Mulai"}</span>
                )}
              </Link>
            );
          })
        )}
      </section>
    </div>
  );
}
