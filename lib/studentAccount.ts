import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const StudentUsernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(24)
  .regex(/^[a-z][a-z0-9-]*[a-z0-9]$/, "Username huruf kecil, angka, dan tanda hubung.");

export const StudentPinSchema = z.string().length(4).regex(/^\d{4}$/);

export const JoinCodeSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase())
  .pipe(z.string().length(6, "Kode kelas 6 huruf/angka."));

const JOIN_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateJoinCode(): string {
  let code = "";
  for (let i = 0; i < 6; i += 1) {
    code += JOIN_ALPHABET[Math.floor(Math.random() * JOIN_ALPHABET.length)];
  }
  return code;
}

export function formatJoinCode(code: string): string {
  const compact = code.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  if (compact.length !== 6) return compact;
  return `${compact.slice(0, 3)}-${compact.slice(3)}`;
}

export function suggestUsername(name: string, grade: number): string {
  const first = name.split(/\s+/)[0]?.toLowerCase().replace(/[^a-z0-9]/g, "") || "siswa";
  return `${first}-k${grade}`.slice(0, 24);
}

export async function uniqueJoinCode(): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const joinCode = generateJoinCode();
    const exists = await prisma.classRoom.findUnique({ where: { joinCode } });
    if (!exists) return joinCode;
  }
  throw new Error("Gagal membuat kode kelas unik.");
}

export async function uniqueUsername(base: string): Promise<string> {
  const parsed = StudentUsernameSchema.safeParse(base);
  const root = parsed.success ? parsed.data : "siswa-k1";
  let candidate = root;
  let counter = 1;
  while (await prisma.studentProfile.findUnique({ where: { username: candidate } })) {
    const suffix = `-${counter}`;
    candidate = `${root.slice(0, 24 - suffix.length)}${suffix}`;
    counter += 1;
  }
  return candidate;
}

export async function findClassByJoinCode(raw: string) {
  const parsed = JoinCodeSchema.safeParse(raw);
  if (!parsed.success) return null;
  return prisma.classRoom.findUnique({ where: { joinCode: parsed.data } });
}
