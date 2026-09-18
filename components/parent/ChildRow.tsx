import Link from "next/link";

export function ChildRow({
  href,
  name,
  grade,
  username,
  count,
}: {
  href: string;
  name: string;
  grade: number;
  username?: string;
  count: number;
}) {
  return (
    <Link href={href} className="surface flex items-center justify-between gap-4 p-5 transition hover:shadow-soft">
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-sm font-bold text-primary">
          {name.slice(0, 1).toUpperCase()}
        </span>
        <div>
          <p className="font-semibold">{name}</p>
          <p className="text-sm text-muted-foreground">
            Kelas {grade} SD{username ? ` · ${username}` : ""}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold">{count} latihan</p>
        <p className="text-xs text-primary">Lihat progres</p>
      </div>
    </Link>
  );
}
