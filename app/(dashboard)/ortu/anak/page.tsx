import { UsersRound } from "@/components/ui/icons";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ChildRow } from "@/components/parent/ChildRow";
import { EmptyState, PageHeader } from "@/components/layout/PageChrome";

export default async function AnakListPage() {
  const session = await auth();
  if (!session?.user) return null;

  const children = await prisma.studentProfile.findMany({
    where: { parentId: session.user.id },
    include: { _count: { select: { submissions: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Anak saya"
        description="Pilih anak untuk melihat riwayat latihan dan nilai."
      />

      {children.length === 0 ? (
        <EmptyState
          icon={<UsersRound className="h-6 w-6" />}
          title="Belum ada profil anak"
          description="Hubungi guru agar anak ditambahkan dan dihubungkan ke akun Anda."
        />
      ) : (
        <div className="grid gap-4">
          {children.map((child) => (
            <ChildRow
              key={child.id}
              href={`/ortu/anak/${child.id}`}
              name={child.name}
              grade={child.grade}
              username={child.username}
              count={child._count.submissions}
            />
          ))}
        </div>
      )}
    </div>
  );
}
