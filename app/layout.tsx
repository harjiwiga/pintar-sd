import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Nunito } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  applicationName: "SoalPintar SD",
  title: {
    default: "SoalPintar SD",
    template: "%s · SoalPintar SD",
  },
  description: "Buat soal latihan SD dengan AI, sesuai Kurikulum Merdeka. Latihan pribadi bisa offline.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SoalPintar",
  },
  formatDetection: {
    telephone: false,
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#0f766e",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className={`${jakarta.className} ${jakarta.variable} ${nunito.variable}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
