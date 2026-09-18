import { describe, expect, it } from "vitest";
import { chunkText, truncateContext, significantWords } from "@/lib/textChunker";
import { detectMimeFromMagic, maxUploadBytes, maxUploadMb, sanitizeExtractedText } from "@/lib/materialText";

describe("chunkText", () => {
  it("mengembalikan array kosong untuk teks kosong", () => {
    expect(chunkText("   ")).toEqual([]);
  });

  it("memecah teks panjang dengan overlap", () => {
    const text = "a".repeat(50);
    const chunks = chunkText(text, 20, 5);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].length).toBeLessThanOrEqual(20);
    expect(chunks.join("").includes("a")).toBe(true);
  });
});

describe("truncateContext", () => {
  it("tidak memotong teks pendek", () => {
    expect(truncateContext("halo", 20)).toBe("halo");
  });

  it("memotong teks panjang dan menambah penanda", () => {
    const result = truncateContext("x".repeat(40), 10);
    expect(result.startsWith("xxxxxxxxxx")).toBe(true);
    expect(result).toContain("materi dipotong");
  });
});

describe("significantWords", () => {
  it("membuang kata pendek", () => {
    expect(significantWords("ini ada fotosintesis ya")).toContain("fotosintesis");
    expect(significantWords("ini ada fotosintesis ya")).not.toContain("ini");
  });
});

describe("sanitizeExtractedText", () => {
  it("membuang karakter kontrol dan merapikan spasi", () => {
    expect(sanitizeExtractedText("Halo\u0000  dunia\r\nbaik  ")).toBe("Halo dunia\nbaik");
  });
});

describe("maxUploadMb", () => {
  it("default 20 MB jika env tidak diisi", () => {
    const previous = process.env.MAX_UPLOAD_SIZE_MB;
    delete process.env.MAX_UPLOAD_SIZE_MB;
    expect(maxUploadMb()).toBe(20);
    expect(maxUploadBytes()).toBe(20 * 1024 * 1024);
    if (previous === undefined) delete process.env.MAX_UPLOAD_SIZE_MB;
    else process.env.MAX_UPLOAD_SIZE_MB = previous;
  });
});

describe("detectMimeFromMagic", () => {
  it("mengenali PDF dari header", () => {
    expect(detectMimeFromMagic(Buffer.from("%PDF-1.4 rest"), "application/octet-stream")).toBe("application/pdf");
  });

  it("mengenali JPEG dari magic bytes", () => {
    expect(detectMimeFromMagic(Buffer.from([0xff, 0xd8, 0xff, 0x00]), "image/jpeg")).toBe("image/jpeg");
  });

  it("menolak buffer yang tidak dikenali", () => {
    expect(detectMimeFromMagic(Buffer.from("hello"), "application/zip")).toBeNull();
  });
});
