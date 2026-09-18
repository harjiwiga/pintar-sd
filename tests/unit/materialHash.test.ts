import { describe, expect, it } from "vitest";
import { hashMaterialBuffer } from "@/lib/materialProcessor";

describe("hashMaterialBuffer", () => {
  it("menghasilkan SHA-256 stabil untuk konten sama", () => {
    const a = Buffer.from("%PDF-1.4 same book bytes");
    const b = Buffer.from("%PDF-1.4 same book bytes");
    expect(hashMaterialBuffer(a)).toBe(hashMaterialBuffer(b));
  });

  it("berbeda jika isi file berbeda", () => {
    expect(hashMaterialBuffer(Buffer.from("a"))).not.toBe(hashMaterialBuffer(Buffer.from("b")));
  });
});
