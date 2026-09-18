import Link from "next/link";
import { BookOpen, PenLine, Sparkles } from "@/components/ui/icons";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EmptyState, PageHeader } from "@/components/layout/PageChrome";
import { Badge, difficultyLabel, difficultyTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { questionTypeLabel } from "@/lib/questionLabels";

export default async function BankSoalPage() {
  const session = await auth();
  if (!session?.user) return null;

  const questions = await prisma.question.findMany({
    where: { createdById: session.user.id },
    include: { topic: { include: { subject: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bank soal"
        description="Soal yang sudah ditinjau dan siap dipakai."
        actions={
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/guru/soal/latihan">
                <PenLine className="h-4 w-4" />
                Buka Soal
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/guru/tugas/buat">Tugaskan</Link>
            </Button>
            <Button asChild>
              <Link href="/guru/soal/buat">
                <Sparkles className="h-4 w-4" />
                Buat soal AI
              </Link>
            </Button>
          </div>
        }
      />

      {questions.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="h-6 w-6" />}
          title="Bank soal masih kosong"
          description="Generate soal dengan AI, tinjau, lalu simpan yang sesuai."
          action={
            <Button asChild>
              <Link href="/guru/soal/buat">Buat soal pertama</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {questions.map((q) => (
            <article key={q.id} className="surface p-5">
              <div className="mb-3 flex flex-wrap gap-2">
                <Badge tone="brand">{q.topic.subject.name}</Badge>
                <Badge>{questionTypeLabel(q.type)}</Badge>
                <Badge>Kelas {q.topic.grade}</Badge>
                <Badge tone={difficultyTone(q.difficulty)}>{difficultyLabel(q.difficulty)}</Badge>
                <Badge tone={q.source === "AI_GENERATED" ? "brand" : "neutral"}>
                  {q.source === "AI_GENERATED" ? "AI" : "Manual"}
                </Badge>
              </div>
              <p className="font-medium leading-6">{q.prompt}</p>
              <p className="mt-2 text-sm text-muted-foreground">{q.topic.name}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
