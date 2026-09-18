import Link from "next/link";
import { Logo } from "@/components/brand/Logo";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
  highlight = "teacher",
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  highlight?: "teacher" | "student";
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-sidebar p-10 text-white lg:flex lg:flex-col">
        <Logo inverted />
        <div className="relative z-10 my-auto max-w-md">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-200/80">
            {highlight === "student" ? "Mode Siswa" : "Untuk Guru & Orang Tua"}
          </p>
          <h1 className="mt-4 font-display text-4xl font-bold leading-tight">
            {highlight === "student"
              ? "Belajar jadi lebih seru, satu soal setiap kali."
              : "Buat soal latihan SD dalam hitungan menit."}
          </h1>
          <p className="mt-4 text-sm leading-6 text-sidebar-muted">
            {highlight === "student"
              ? "Masuk dengan username dan PIN dari guru atau orang tua. Umpan balik langsung setelah menjawab."
              : "Generate soal dengan AI, tinjau dulu, lalu tugaskan ke kelas. Sesuai Kurikulum Merdeka."}
          </p>
          <ul className="mt-8 space-y-3 text-sm text-emerald-50/90">
            {(highlight === "student"
              ? ["Tampilan sederhana", "Langsung tahu benar atau salah", "Pembahasan yang mudah dipahami"]
              : ["Soal berdasar mapel, kelas, dan topik", "Tinjau sebelum disimpan", "Laporan progres per siswa"]
            ).map((item) => (
              <li key={item} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-primary/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 h-72 w-72 rounded-full bg-accent/20 blur-3xl" />
      </aside>

      <section className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-8">{children}</div>
          {footer ? <div className="mt-6 text-sm text-muted-foreground">{footer}</div> : null}
          <p className="mt-8 text-center text-xs text-muted-foreground">
            <Link href="/" className="hover:text-foreground">
              SoalPintar SD
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
