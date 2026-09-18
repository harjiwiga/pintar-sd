"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { SignOutButton } from "@/components/layout/SignOutButton";

function initials(name?: string | null) {
  if (!name) return "U";
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function AppShell({
  name,
  role,
  children,
}: {
  name?: string | null;
  role?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const roleLabel =
    role === "TEACHER" ? "Guru" : role === "PARENT" ? "Orang Tua" : role === "ADMIN" ? "Admin" : "Pengguna";

  return (
    <div className="min-h-screen">
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/80 bg-background/85 px-4 backdrop-blur-md sm:px-6">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-xl p-2 text-foreground hover:bg-muted lg:hidden"
            aria-label="Buka menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <p className="hidden text-sm text-muted-foreground lg:block">
            Latihan berkualitas, ditinjau guru, sesuai Kurikulum Merdeka.
          </p>
          <div className="ml-auto flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-semibold leading-none">{name}</p>
              <p className="mt-1 text-xs text-muted-foreground">{roleLabel}</p>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              {initials(name)}
            </div>
            <SignOutButton />
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl p-4 pb-12 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
