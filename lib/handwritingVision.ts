import { sanitizeExtractedText } from "@/lib/materialText";

export function cleanVisionTranscript(raw: string): string {
  return sanitizeExtractedText(
    raw
      .replace(/^```[\w]*\n?/g, "")
      .replace(/```$/g, "")
      .replace(/^(berikut( ini)?( adalah)? )?(transkripsi|teks|hasil)[:\s-]*/i, "")
  );
}

export function visionConfig() {
  const provider = (process.env.VISION_PROVIDER ?? "").trim().toLowerCase();
  const apiKey = (process.env.VISION_API_KEY ?? "").trim();
  const model = (process.env.VISION_MODEL ?? "").trim();
  if (!provider || !apiKey) return null;
  return { provider, apiKey, model };
}

export async function transcribeHandwritingVision(
  buffer: Buffer,
  mime: string,
  options: { singleLine?: boolean } = {}
): Promise<string | null> {
  const config = visionConfig();
  if (!config) return null;

  const prompt = [
    "Transkripsikan tulisan tangan siswa pada gambar ini secara harfiah.",
    options.singleLine ? "Ini jawaban singkat satu baris." : "Ini jawaban uraian, boleh lebih dari satu baris.",
    "Bahasa utama: Indonesia.",
    "Jangan menebak kata yang tidak tertulis.",
    "Jangan menambah penjelasan, tanda kutip, atau markdown.",
    "Jika sama sekali tidak terbaca, kembalikan teks kosong.",
    "Kembalikan hanya teks jawaban.",
  ].join(" ");

  const base64 = buffer.toString("base64");

  if (config.provider === "google") {
    return transcribeWithGemini(config.apiKey, config.model || "gemini-3.6-flash", prompt, mime, base64);
  }

  if (config.provider === "openai" || config.provider === "openrouter") {
    return transcribeWithOpenAI(config, prompt, mime, base64);
  }

  return null;
}

async function transcribeWithGemini(
  apiKey: string,
  model: string,
  prompt: string,
  mime: string,
  base64: string
): Promise<string> {
  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  const genAI = new GoogleGenerativeAI(apiKey);
  const vision = genAI.getGenerativeModel({ model });
  const result = await vision.generateContent([
    { text: prompt },
    { inlineData: { mimeType: mime, data: base64 } },
  ]);
  return cleanVisionTranscript(result.response.text() ?? "");
}

async function transcribeWithOpenAI(
  config: { apiKey: string; model: string; provider: string },
  prompt: string,
  mime: string,
  base64: string
): Promise<string> {
  const { OpenAI } = await import("openai");
  const client = new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.provider === "openrouter" ? process.env.LLM_BASE_URL || "https://openrouter.ai/api/v1" : undefined,
    timeout: parseInt(process.env.LLM_TIMEOUT_MS ?? "30000", 10),
  });

  const completion = await client.chat.completions.create({
    model: config.model || "gpt-4o-mini",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: `data:${mime};base64,${base64}` } },
        ],
      },
    ],
  });

  return cleanVisionTranscript(completion.choices[0]?.message?.content ?? "");
}
