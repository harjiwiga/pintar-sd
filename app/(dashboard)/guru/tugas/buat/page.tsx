import Link from "next/link";
import { ArrowLeft } from "@/components/ui/icons";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageChrome";
import { CreateAssignmentForm } from "@/components/assignment/CreateAssignmentForm";

export default async function BuatTugasPage() {
  const session = await auth();
  if (!session?.user) return null;

  const [classes, questions] = await Promise.all([
    prisma.classRoom.findMany({
      where: { teacherId: session.user.id },
      orderBy: [{ grade: "asc" }, { name: "asc" }],
    }),
    prisma.question.findMany({
      where: { createdById: session.user.id },
      include: { topic: { include: { subject: true } } },
      orderBy: { createdAt: "desc" },
      take: 80,
    }),
  ]);

  return (
    <div className="space-y-6">
      <Link href="/guru/tugas" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
        <ArrowLeft className="h-4 w-4" />
        Semua penugasan
      </Link>
      <PageHeader
        title="Buat penugasan"
        description="Pilih kelas dan soal dari bank soal. Murid akan melihatnya setelah masuk."
      />
      <CreateAssignmentForm
        classes={classes.map((item) => ({ id: item.id, name: item.name, grade: item.grade }))}
        questions={questions.map((item) => ({
          id: item.id,
          prompt: item.prompt,
          type: item.type,
          weight: item.weight,
          subject: item.topic.subject.name,
          topic: item.topic.name,
          grade: item.topic.grade,
        }))}
      />
    </div>
  );
}
