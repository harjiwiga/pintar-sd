import { describe, expect, it } from "vitest";
import { requireStudentProfileId, requireUserId } from "@/lib/session";

describe("session helpers", () => {
  it("guru mendapat userId, murid tidak", () => {
    expect(requireUserId({ user: { id: "guru-1", role: "TEACHER" } })).toBe("guru-1");
    expect(requireUserId({ user: { id: "siswa-1", role: "STUDENT" } })).toBeNull();
  });

  it("hanya sesi murid yang punya studentProfileId", () => {
    expect(requireStudentProfileId({ user: { studentProfileId: "s1", role: "STUDENT" } })).toBe("s1");
    expect(requireStudentProfileId({ user: { studentProfileId: "s1", role: "TEACHER" } })).toBeNull();
    expect(requireStudentProfileId(null)).toBeNull();
  });
});
