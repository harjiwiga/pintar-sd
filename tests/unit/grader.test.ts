import { describe, it, expect } from "vitest";
import { gradeAnswer, calculateScore, gradeEssay, scoreQuiz, buildCorrection } from "@/lib/grader";
import { normalizeText } from "@/lib/textChunker";

describe("gradeAnswer", () => {
  it("menilai benar untuk pilihan ganda yang cocok", () => {
    expect(gradeAnswer({ questionType: "MULTIPLE_CHOICE", correctKey: "B", correctText: null, studentAnswer: "B" })).toBe(true);
  });

  it("menilai salah untuk pilihan ganda yang tidak cocok", () => {
    expect(gradeAnswer({ questionType: "MULTIPLE_CHOICE", correctKey: "B", correctText: null, studentAnswer: "A" })).toBe(false);
  });

  it("menilai benar untuk isian singkat dengan normalisasi", () => {
    expect(gradeAnswer({ questionType: "SHORT_ANSWER", correctKey: null, correctText: "Soekarno", studentAnswer: "  soekarno  " })).toBe(true);
  });

  it("menilai benar untuk benar/salah", () => {
    expect(gradeAnswer({ questionType: "TRUE_FALSE", correctKey: "BENAR", correctText: null, studentAnswer: "BENAR" })).toBe(true);
  });
});

describe("gradeEssay", () => {
  it("menilai benar jika overlap kata kunci cukup", () => {
    const expected = "Fotosintesis adalah proses tumbuhan membuat makanan dengan bantuan cahaya matahari";
    const answer = "Tumbuhan membuat makanan lewat fotosintesis dengan bantuan cahaya matahari";
    expect(gradeEssay(expected, answer)).toBe(true);
  });

  it("menilai salah jika jawaban terlalu singkat atau tidak relevan", () => {
    expect(gradeEssay("Fotosintesis membutuhkan cahaya matahari dan klorofil", "tidak tahu")).toBe(false);
  });

  it("menilai benar jika teks sama setelah normalisasi", () => {
    expect(gradeEssay("Ibu kota Indonesia adalah Jakarta.", "ibu kota indonesia adalah jakarta")).toBe(true);
  });
});

describe("normalizeText", () => {
  it("lowercase dan trim", () => {
    expect(normalizeText("  Pecahan  ")).toBe("pecahan");
  });
  it("hapus tanda baca di akhir", () => {
    expect(normalizeText("jakarta.")).toBe("jakarta");
  });
});

describe("calculateScore", () => {
  it("hitung skor dengan benar", () => {
    const answers = [
      { isCorrect: true }, { isCorrect: true }, { isCorrect: false },
      { isCorrect: true }, { isCorrect: false },
    ];
    expect(calculateScore(answers)).toBe(60);
  });
  it("kembalikan 0 untuk array kosong", () => {
    expect(calculateScore([])).toBe(0);
  });
});

describe("scoreQuiz", () => {
  it("menghitung skor campuran PG dan esai serta menampilkan koreksi jika salah", () => {
    const result = scoreQuiz([
      {
        id: "1",
        type: "MULTIPLE_CHOICE",
        prompt: "Ibu kota Indonesia?",
        correctKey: "A",
        correctText: null,
        explanation: "Jakarta adalah ibu kota.",
        studentAnswer: "B",
      },
      {
        id: "2",
        type: "ESSAY",
        prompt: "Jelaskan fotosintesis.",
        correctKey: null,
        correctText: "Fotosintesis adalah proses tumbuhan membuat makanan dengan bantuan cahaya matahari",
        explanation: "Tumbuhan memakai cahaya untuk membuat makanan.",
        studentAnswer: "Tumbuhan membuat makanan dengan bantuan cahaya matahari melalui fotosintesis",
      },
    ]);

    expect(result.total).toBe(2);
    expect(result.correctCount).toBe(1);
    expect(result.score).toBe(50);
    expect(result.results[0].isCorrect).toBe(false);
    expect(result.results[0].correction).toContain("Kunci jawaban: A");
    expect(result.results[0].correction).toContain("Jakarta adalah ibu kota.");
    expect(result.results[1].isCorrect).toBe(true);
    expect(result.results[1].correction).toBeNull();
  });
});

describe("scoreQuiz weighted", () => {
  it("benar semua menghasilkan 100", () => {
    const result = scoreQuiz([
      {
        id: "1",
        type: "MULTIPLE_CHOICE",
        prompt: "Soal PG",
        correctKey: "A",
        explanation: "Pembahasan PG yang cukup panjang.",
        studentAnswer: "A",
        weight: 2,
      },
      {
        id: "2",
        type: "SHORT_ANSWER",
        prompt: "Soal isian",
        correctText: "Jakarta",
        explanation: "Pembahasan isian yang cukup panjang.",
        studentAnswer: "Jakarta",
        weight: 3,
      },
    ]);
    expect(result.score).toBe(100);
    expect(result.earnedWeight).toBe(5);
  });

  it("mengurangi skor sesuai bobot soal yang salah", () => {
    const result = scoreQuiz([
      {
        id: "1",
        type: "MULTIPLE_CHOICE",
        prompt: "Soal PG",
        correctKey: "A",
        explanation: "Pembahasan PG yang cukup panjang.",
        studentAnswer: "B",
        weight: 1,
      },
      {
        id: "2",
        type: "ESSAY",
        prompt: "Jelaskan fotosintesis dengan kalimat sendiri.",
        correctText: "Fotosintesis adalah proses tumbuhan membuat makanan dengan bantuan cahaya matahari",
        explanation: "Pembahasan esai yang cukup panjang.",
        studentAnswer: "Tumbuhan membuat makanan dengan bantuan cahaya matahari melalui fotosintesis",
        weight: 3,
      },
    ]);
    expect(result.score).toBe(75);
    expect(result.results[0].deducted).toBe(25);
    expect(result.results[1].deducted).toBe(0);
  });
});

describe("buildCorrection", () => {
  it("menyusun teks koreksi untuk esai", () => {
    const text = buildCorrection("ESSAY", "Jawaban model", "Pembahasan singkat");
    expect(text).toContain("Jawaban yang diharapkan: Jawaban model");
    expect(text).toContain("Pembahasan: Pembahasan singkat");
  });
});
