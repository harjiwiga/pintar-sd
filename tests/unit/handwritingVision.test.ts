import { describe, expect, it } from "vitest";
import { cleanVisionTranscript } from "@/lib/handwritingVision";

describe("cleanVisionTranscript", () => {
  it("membuang markdown dan label", () => {
    expect(cleanVisionTranscript("```\nPecahan 1/2\n```")).toBe("Pecahan 1/2");
    expect(cleanVisionTranscript("Transkripsi: bumi berbentuk bulat")).toBe("bumi berbentuk bulat");
  });
});
