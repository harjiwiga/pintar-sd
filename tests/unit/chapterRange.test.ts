import { describe, expect, it } from "vitest";
import {
  chapterNumber,
  formatChapterOption,
  formatChapterScope,
  matchTopicId,
  sliceTopicRange,
} from "@/lib/chapterRange";

const topics = [
  { id: "a", name: "Bilangan" },
  { id: "b", name: "Pecahan" },
  { id: "c", name: "Desimal" },
  { id: "d", name: "Persen" },
];

describe("sliceTopicRange", () => {
  it("mengambil satu bab jika dari dan sampai sama", () => {
    expect(sliceTopicRange(topics, "b", "b")).toEqual([{ id: "b", name: "Pecahan" }]);
  });

  it("mengambil rentang bab berurutan", () => {
    expect(sliceTopicRange(topics, "b", "d").map((t) => t.name)).toEqual(["Pecahan", "Desimal", "Persen"]);
  });

  it("membalik otomatis jika dari > sampai", () => {
    expect(sliceTopicRange(topics, "d", "b").map((t) => t.id)).toEqual(["b", "c", "d"]);
  });

  it("mengembalikan kosong jika id tidak ada", () => {
    expect(sliceTopicRange(topics, "x", "b")).toEqual([]);
  });
});

describe("formatChapterScope", () => {
  it("menuliskan satu bab", () => {
    expect(formatChapterScope([{ name: "Pecahan" }], 2)).toBe("Bab 2 (Pecahan)");
  });

  it("menuliskan rentang bab", () => {
    expect(formatChapterScope([{ name: "Pecahan" }, { name: "Desimal" }], 2)).toBe(
      "Bab 2–3 (Pecahan; Desimal)"
    );
  });
});

describe("chapter helpers", () => {
  it("menghitung nomor bab dari urutan daftar", () => {
    expect(chapterNumber(topics, "c")).toBe(3);
    expect(formatChapterOption(2, "Desimal")).toBe("Bab 3 — Desimal");
  });

  it("mencocokkan nama bab ke id topik", () => {
    expect(matchTopicId(topics, "desimal")).toBe("c");
    expect(matchTopicId(topics, "tidak ada")).toBe("a");
  });
});
