import { describe, expect, it } from "vitest";
import {
  formatJoinCode,
  generateJoinCode,
  JoinCodeSchema,
  StudentUsernameSchema,
  suggestUsername,
} from "@/lib/studentAccount";

describe("studentAccount", () => {
  it("menormalisasi kode kelas dengan tanda hubung", () => {
    expect(JoinCodeSchema.parse("ab3-k7x")).toBe("AB3K7X");
    expect(formatJoinCode("AB3K7X")).toBe("AB3-K7X");
  });

  it("kode acak selalu 6 karakter aman dibaca", () => {
    const code = generateJoinCode();
    expect(code).toHaveLength(6);
    expect(code).toMatch(/^[A-Z2-9]+$/);
  });

  it("menyarankan username dari nama dan kelas", () => {
    expect(suggestUsername("Budi Santoso", 4)).toBe("budi-k4");
    expect(StudentUsernameSchema.parse("budi-k4")).toBe("budi-k4");
  });

  it("menolak username tidak valid", () => {
    expect(StudentUsernameSchema.safeParse("ab").success).toBe(false);
    expect(StudentUsernameSchema.safeParse("Budi").success).toBe(true);
    expect(StudentUsernameSchema.parse("Budi")).toBe("budi");
  });
});
