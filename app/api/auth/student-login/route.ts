import { NextRequest, NextResponse } from "next/server";

// Login siswa sekarang lewat NextAuth provider "student".
export async function POST(_req: NextRequest) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: "GONE",
        message: "Gunakan halaman masuk siswa. Sesi murid sekarang dikelola server.",
      },
    },
    { status: 410 }
  );
}
