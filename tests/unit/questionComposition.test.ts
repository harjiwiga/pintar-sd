import { describe, expect, it } from "vitest";
import { calculateWeightedScore, resolveComposition } from "@/lib/questionComposition";

describe("resolveComposition", () => {
  it("membaca jumlah per jenis dari form", () => {
    const result = resolveComposition({
      subject: "Matematika",
      grade: 4,
      topic: "Pecahan",
      difficulty: "MEDIUM",
      questionType: "MIXED",
      multipleChoiceCount: 4,
      shortAnswerCount: 2,
      essayCount: 1,
      multipleChoiceWeight: 2,
      shortAnswerWeight: 3,
      essayWeight: 5,
    });
    expect(result.total).toBe(7);
    expect(result.questionType).toBe("MIXED");
    expect(result.essayWeight).toBe(5);
  });

  it("esai 0 tetap valid jika ada jenis lain", () => {
    const result = resolveComposition({
      subject: "IPAS",
      grade: 3,
      topic: "Tumbuhan",
      difficulty: "EASY",
      questionType: "MIXED",
      multipleChoiceCount: 3,
      shortAnswerCount: 1,
      essayCount: 0,
    });
    expect(result.total).toBe(4);
    expect(result.essayCount).toBe(0);
  });
});

describe("calculateWeightedScore", () => {
  it("menghasilkan 100 jika semua benar", () => {
    expect(
      calculateWeightedScore([
        { isCorrect: true, weight: 2 },
        { isCorrect: true, weight: 3 },
      ])
    ).toBe(100);
  });

  it("memotong sesuai bobot", () => {
    expect(
      calculateWeightedScore([
        { isCorrect: false, weight: 1 },
        { isCorrect: true, weight: 3 },
      ])
    ).toBe(75);
  });
});
