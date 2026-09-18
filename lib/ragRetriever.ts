import { prisma } from "@/lib/prisma";
import { significantWords, truncateContext } from "@/lib/textChunker";

/**
 * Mengambil potongan dokumen kurikulum yang paling relevan
 * untuk digunakan sebagai konteks RAG pada prompt generate soal.
 */
export async function retrieveKurikulumContext(
  subject: string,
  grade: number,
  topic: string,
  topK?: number
): Promise<string> {
  const k = topK ?? parseInt(process.env.RAG_TOP_K ?? "4", 10);

  // Buat query embedding
  const query = `${subject} kelas ${grade} SD ${topic} Kurikulum Merdeka capaian pembelajaran`;
  const queryEmbedding = await embedText(query);

  if (!queryEmbedding) {
    // Embedding tidak tersedia (API key belum diset), kembalikan string kosong
    return "";
  }

  // Similarity search via pgvector (cosine distance operator: <=>)
  const chunks = await prisma.$queryRaw<Array<{ content: string }>>`
    SELECT content
    FROM "KurikulumChunk"
    WHERE subject = ${subject}
      AND (grade IS NULL OR grade = ${grade})
    ORDER BY embedding <=> ${JSON.stringify(queryEmbedding)}::vector
    LIMIT ${k}
  `;

  return chunks.map((c) => c.content).join("\n\n---\n\n");
}

/**
 * Embed sebuah teks menjadi vektor float[] menggunakan model embedding.
 * Mengembalikan null jika API key tidak tersedia.
 */
export async function embedText(text: string): Promise<number[] | null> {
  const provider = process.env.EMBEDDING_PROVIDER ?? "openai";
  const apiKey = process.env.EMBEDDING_API_KEY ?? process.env.LLM_API_KEY ?? "";

  if (!apiKey) return null;

  if (provider === "openai") {
    const { OpenAI } = await import("openai");
    const client = new OpenAI({ apiKey });
    const model = process.env.EMBEDDING_MODEL ?? "text-embedding-3-small";
    const response = await client.embeddings.create({
      model,
      input: text,
    });
    return response.data[0].embedding;
  }

  return null;
}

/**
 * Ambil konteks dari dokumen yang diunggah pengguna (tanpa wajib embedding).
 */
export async function retrieveUserMaterialContext(
  materialId: string,
  _userId: string,
  topic?: string,
  maxChars = 8000
): Promise<string> {
  // Pustaka bersama: guru/ortu boleh memakai dokumen siap pakai milik siapa saja
  const material = await prisma.userMaterial.findFirst({
    where: { id: materialId, status: "READY" },
    include: { chunks: { orderBy: { chunkIndex: "asc" } } },
  });

  if (!material) return "";

  const chunks = material.chunks.map((c) => c.content).filter(Boolean);
  if (chunks.length === 0) {
    return truncateContext(material.extractedText ?? "", maxChars);
  }

  const keys = topic ? significantWords(topic) : [];
  const ranked = keys.length
    ? [...chunks].sort((a, b) => scoreChunk(b, keys) - scoreChunk(a, keys))
    : chunks;

  return truncateContext(ranked.join("\n\n---\n\n"), maxChars);
}

function scoreChunk(content: string, keys: string[]): number {
  const lower = content.toLowerCase();
  return keys.reduce((sum, key) => sum + (lower.includes(key) ? 1 : 0), 0);
}
