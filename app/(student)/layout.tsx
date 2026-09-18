import { redirect } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import { SignOutButton } from "@/components/layout/SignOutButton";
import { auth } from "@/lib/auth";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login-siswa");
  if (session.user.role !== "STUDENT") redirect("/");

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/80 bg-white/80 px-4 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Logo />
          <div className="flex items-center gap-3">
            <p className="text-sm font-semibold">{session.user.name}</p>
            <SignOutButton callbackUrl="/login-siswa" />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">{children}</main>
    </div>
  );
}
