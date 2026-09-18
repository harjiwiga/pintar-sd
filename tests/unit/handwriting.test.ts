import { describe, expect, it } from "vitest";
import { decodeImageDataUrl, inkBounds } from "@/lib/handwriting";

const PNG_1X1 =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

describe("decodeImageDataUrl", () => {
  it("membaca PNG data URL yang valid", () => {
    const decoded = decodeImageDataUrl(PNG_1X1);
    expect(decoded?.mime).toBe("image/png");
    expect(decoded?.buffer.length).toBeGreaterThan(32);
  });

  it("menolak data yang bukan gambar", () => {
    expect(decodeImageDataUrl("data:text/plain;base64,YQ==")).toBeNull();
    expect(decodeImageDataUrl("bukan-data-url")).toBeNull();
  });

  it("menghitung batas coretan untuk potong gambar OCR", () => {
    const bounds = inkBounds([
      [
        { x: 10, y: 20 },
        { x: 40, y: 50 },
      ],
    ]);
    expect(bounds).toEqual({ minX: 10, minY: 20, maxX: 40, maxY: 50, width: 30, height: 30 });
    expect(inkBounds([])).toBeNull();
  });
});
