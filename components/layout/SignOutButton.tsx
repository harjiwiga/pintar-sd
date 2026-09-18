"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export function SignOutButton({ callbackUrl = "/login" }: { callbackUrl?: string }) {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl })}
      className="rounded-xl p-2 text-muted-foreground hover:bg-red-50 hover:text-destructive"
      aria-label="Keluar"
    >
      <LogOut className="h-4 w-4" />
    </button>
  );
}
