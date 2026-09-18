"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  ClipboardList,
  FileUp,
  LayoutDashboard,
  PenLine,
  Sparkles,
  Users,
  UsersRound,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/Logo";

const GURU_LINKS = [
  { href: "/guru", label: "Ringkasan", icon: LayoutDashboard },
  { href: "/guru/kelas", label: "Kelas", icon: Users },
  { href: "/guru/materi", label: "Materi", icon: FileUp },
  { href: "/guru/soal", label: "Bank Soal", icon: BookOpen },
  { href: "/guru/soal/buat", label: "Buat Soal AI", icon: Sparkles },
  { href: "/guru/soal/latihan", label: "Soal", icon: PenLine },
  { href: "/guru/tugas", label: "Penugasan", icon: ClipboardList },
];

const ORTU_LINKS = [
  { href: "/ortu", label: "Ringkasan", icon: LayoutDashboard },
  { href: "/ortu/anak", label: "Anak Saya", icon: UsersRound },
  { href: "/ortu/materi", label: "Materi", icon: FileUp },
  { href: "/ortu/soal/buat", label: "Buat Soal AI", icon: Sparkles },
  { href: "/ortu/soal", label: "Soal", icon: PenLine },
];

function isActive(pathname: string, href: string) {
  if (href === "/guru" || href === "/ortu") return pathname === href;
  if (href === "/guru/soal" || href === "/ortu/soal") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({
  open,
  onClose,
}: {
  open?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const isGuru = pathname.startsWith("/guru");
  const links = isGuru ? GURU_LINKS : ORTU_LINKS;

  return (
    <>
      {open ? (
        <button
          type="button"
          aria-label="Tutup menu"
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={onClose}
        />
      ) : null}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 flex-col bg-sidebar text-sidebar-foreground",
          open ? "flex" : "hidden lg:flex"
        )}
      >
        <div className="flex items-center justify-between px-5 py-5">
          <Logo inverted />
          <button
            type="button"
            className="rounded-lg p-1.5 text-sidebar-muted hover:bg-white/10 lg:hidden"
            onClick={onClose}
            aria-label="Tutup menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="px-5 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-sidebar-muted">
          {isGuru ? "Ruang Guru" : "Ruang Orang Tua"}
        </p>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3">
          {links.map((link) => {
            const active = isActive(pathname, link.href);
            const Icon = link.icon;

            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                  active
                    ? "bg-white/12 text-white shadow-sm"
                    : "text-sidebar-muted hover:bg-white/8 hover:text-white"
                )}
              >
                <Icon className="h-4 w-4" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="m-3 rounded-2xl bg-sidebar-accent p-4 text-xs leading-relaxed text-sidebar-muted">
          Unggah materi, generate soal, lalu hitung skor bersama anak.
        </div>
      </aside>
    </>
  );
}
