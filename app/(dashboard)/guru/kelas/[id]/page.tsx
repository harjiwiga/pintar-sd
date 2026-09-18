import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Users } from "@/components/ui/icons";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EmptyState, PageHeader } from "@/components/layout/PageChrome";
import { Button } from "@/components/ui/button";
import { AddStudentForm } from "@/components/class/AddStudentForm";
import { ClassJoinCode } from "@/components/class/ClassJoinCode";
import { uniqueJoinCode } from "@/lib/studentAccount";

export default async function KelasDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return null;

  const { id } = await params;
  const classroom = await prisma.classRoom.findFirst({
    where: { id, teacherId: session.user.id },
    include: {
      students: { orderBy: { name: "asc" } },
      _count: { select: { assignments: true } },
    },
  });
  if (!classroom) notFound();

  const joinCode = classroom.joinCode || (await uniqueJoinCode());
  if (!classroom.joinCode) {
    await prisma.classRoom.update({ where: { id: classroom.id }, data: { joinCode } });
  }

  return (
    <div className="space-y-6">
      <Link href="/guru/kelas" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
        <ArrowLeft className="h-4 w-4" />
        Semua kelas
      </Link>

      <PageHeader
        title={classroom.name}
        description={`Kelas ${classroom.grade} SD · ${classroom.students.length} siswa · ${classroom._count.assignments} tugas`}
        actions={
          <Button asChild>
            <Link href="/guru/tugas/buat">Tugaskan soal</Link>
          </Button>
        }
      />

      <ClassJoinCode joinCode={joinCode} />

      <section className="surface p-5">
        <h2 className="font-semibold">Tambah siswa manual</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Atau buatkan akun dari sini. Berikan username dan PIN ke murid untuk masuk di /login-siswa.
        </p>
        <div className="mt-4">
          <AddStudentForm classId={classroom.id} defaultGrade={classroom.grade} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Daftar siswa</h2>
        {classroom.students.length === 0 ? (
          <EmptyState
            icon={<Users className="h-6 w-6" />}
            title="Belum ada siswa"
            description="Tambahkan siswa di atas, lalu catat username dan PIN-nya."
          />
        ) : (
          <div className="space-y-2">
            {classroom.students.map((student) => (
              <div key={student.id} className="surface flex items-center justify-between p-4">
                <div>
                  <p className="font-semibold">{student.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {student.username} · Kelas {student.grade}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
