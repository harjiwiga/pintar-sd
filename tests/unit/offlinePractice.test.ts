import { describe, it, expect } from "vitest";
import {
  hasGradingKeys,
  mergeSubjectCounts,
  packHasGradingKeys,
  scorePracticeLocally,
  summarizeOfflinePacks,
  toScoreQuizItems,
  type OfflinePracticePack,
  type OfflinePracticeQuestion,
} from "@/lib/offlinePractice";

const sampleQuestions: OfflinePracticeQuestion[] = [
  {
    id: "1",
    type: "MULTIPLE_CHOICE",
    prompt: "Ibu kota Indonesia?",
    choices: [
      { key: "A", text: "Jakarta" },
      { key: "B", text: "Bandung" },
    ],
    difficulty: "EASY",
    topic: "Wilayah",
    subject: "IPAS",
    grade: 4,
    weight: 2,
    correctKey: "A",
    correctText: null,
    explanation: "Jakarta adalah ibu kota.",
  },
  {
    id: "2",
    type: "SHORT_ANSWER",
    prompt: "Siapa proklamator?",
    difficulty: "EASY",
    topic: "Sejarah",
    subject: "IPAS",
    grade: 4,
    weight: 3,
    correctKey: null,
    correctText: "Soekarno",
    explanation: "Soekarno memproklamasikan kemerdekaan.",
  },
];

describe("hasGradingKeys", () => {
  it("true jika ada correctKey", () => {
    expect(hasGradingKeys({ correctKey: "A", correctText: null })).toBe(true);
  });

  it("true jika ada correctText", () => {
    expect(hasGradingKeys({ correctKey: null, correctText: "Jakarta" })).toBe(true);
  });

  it("false jika hanya explanation tanpa kunci", () => {
    expect(hasGradingKeys({ correctKey: null, correctText: null, explanation: "Pembahasan" })).toBe(false);
  });

  it("false untuk string kosong", () => {
    expect(hasGradingKeys({ correctKey: "", correctText: "" })).toBe(false);
  });
});

describe("packHasGradingKeys", () => {
  it("true jika semua soal punya kunci", () => {
    expect(packHasGradingKeys(sampleQuestions)).toBe(true);
  });

  it("false jika ada soal tanpa kunci", () => {
    expect(
      packHasGradingKeys([
        sampleQuestions[0],
        { ...sampleQuestions[1], correctText: null, correctKey: null },
      ])
    ).toBe(false);
  });

  it("false untuk paket kosong", () => {
    expect(packHasGradingKeys([])).toBe(false);
  });
});

describe("toScoreQuizItems", () => {
  it("memetakan jawaban siswa ke input grader", () => {
    const items = toScoreQuizItems(sampleQuestions, { "1": "A", "2": "soekarno" });
    expect(items).toHaveLength(2);
    expect(items[0].studentAnswer).toBe("A");
    expect(items[0].correctKey).toBe("A");
    expect(items[1].studentAnswer).toBe("soekarno");
    expect(items[1].correctText).toBe("Soekarno");
  });
});

describe("scorePracticeLocally", () => {
  it("menghitung skor lokal sama seperti grader server", () => {
    const result = scorePracticeLocally(sampleQuestions, { "1": "A", "2": "Soekarno" });
    expect(result.score).toBe(100);
    expect(result.correctCount).toBe(2);
    expect(result.earnedWeight).toBe(5);
  });

  it("mengurangi skor sesuai bobot jika ada yang salah", () => {
    const result = scorePracticeLocally(sampleQuestions, { "1": "B", "2": "Soekarno" });
    expect(result.score).toBe(60);
    expect(result.correctCount).toBe(1);
    expect(result.results[0].isCorrect).toBe(false);
    expect(result.results[0].deducted).toBe(40);
  });

  it("melempar jika kunci tidak lengkap", () => {
    expect(() =>
      scorePracticeLocally([{ ...sampleQuestions[0], correctKey: null }], { "1": "A" })
    ).toThrow("OFFLINE_KEYS_MISSING");
  });
});

describe("summarizeOfflinePacks / mergeSubjectCounts", () => {
  const packs: OfflinePracticePack[] = [
    { subject: "Matematika", savedAt: "2026-01-01T00:00:00.000Z", questions: sampleQuestions },
    { subject: "IPAS", savedAt: "2026-01-02T00:00:00.000Z", questions: [sampleQuestions[0]] },
  ];

  it("meringkas paket offline", () => {
    expect(summarizeOfflinePacks(packs)).toEqual([
      { name: "IPAS", count: 1, savedAt: "2026-01-02T00:00:00.000Z" },
      { name: "Matematika", count: 2, savedAt: "2026-01-01T00:00:00.000Z" },
    ]);
  });

  it("menggabungkan katalog online dengan ringkasan offline", () => {
    const merged = mergeSubjectCounts(
      [
        { name: "Matematika", count: 5 },
        { name: "Bahasa Indonesia", count: 0 },
      ],
      summarizeOfflinePacks(packs)
    );
    expect(merged.find((s) => s.name === "Matematika")).toMatchObject({
      name: "Matematika",
      count: 5,
      savedAt: "2026-01-01T00:00:00.000Z",
    });
    expect(merged.find((s) => s.name === "IPAS")).toMatchObject({ name: "IPAS", count: 1 });
    expect(merged.find((s) => s.name === "Bahasa Indonesia")).toMatchObject({
      name: "Bahasa Indonesia",
      count: 0,
    });
  });
});
