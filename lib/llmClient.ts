/**
 * LLMClient — abstraksi provider LLM.
 * Provider dikonfigurasi via env vars LLM_PROVIDER, LLM_MODEL, LLM_API_KEY.
 */

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMResponse {
  text: string;
  inputTokens?: number;
  outputTokens?: number;
}

export interface LLMClientConfig {
  provider: string;
  model: string;
  apiKey: string;
  baseUrl?: string;
  timeoutMs: number;
}

export interface LLMClient {
  chat(messages: LLMMessage[]): Promise<LLMResponse>;
}

// ─── OpenAI / OpenRouter implementation ──────────────────────

class OpenAIClient implements LLMClient {
  constructor(private config: LLMClientConfig) {}

  async chat(messages: LLMMessage[]): Promise<LLMResponse> {
    const { OpenAI } = await import("openai");
    const client = new OpenAI({
      apiKey: this.config.apiKey,
      baseURL: this.config.baseUrl,
      timeout: this.config.timeoutMs,
    });

    const completion = await client.chat.completions.create({
      model: this.config.model,
      messages,
      response_format: { type: "json_object" },
    });

    return {
      text: completion.choices[0].message.content ?? "",
      inputTokens: completion.usage?.prompt_tokens,
      outputTokens: completion.usage?.completion_tokens,
    };
  }
}

// ─── Anthropic implementation ────────────────────────────────

class AnthropicClient implements LLMClient {
  constructor(private config: LLMClientConfig) {}

  async chat(messages: LLMMessage[]): Promise<LLMResponse> {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic({ apiKey: this.config.apiKey });

    const systemMsg = messages.find((m) => m.role === "system")?.content ?? "";
    const userMessages = messages.filter((m) => m.role !== "system");

    const response = await client.messages.create({
      model: this.config.model,
      max_tokens: 4096,
      system: systemMsg,
      messages: userMessages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    return {
      text,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    };
  }
}

// ─── Google Gemini implementation ────────────────────────────

class GoogleClient implements LLMClient {
  constructor(private config: LLMClientConfig) {}

  async chat(messages: LLMMessage[]): Promise<LLMResponse> {
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(this.config.apiKey);
    const model = genAI.getGenerativeModel({
      model: this.config.model,
      generationConfig: { responseMimeType: "application/json" },
    });

    const prompt = messages.map((m) => `${m.role}: ${m.content}`).join("\n\n");
    const result = await model.generateContent(prompt);
    return { text: result.response.text() };
  }
}

// ─── Factory ─────────────────────────────────────────────────

export function createLLMClient(): LLMClient {
  const config: LLMClientConfig = {
    provider: process.env.LLM_PROVIDER ?? "openai",
    model: process.env.LLM_MODEL ?? "gpt-4o-mini",
    apiKey: process.env.LLM_API_KEY ?? "",
    baseUrl: process.env.LLM_BASE_URL,
    timeoutMs: parseInt(process.env.LLM_TIMEOUT_MS ?? "30000", 10),
  };

  switch (config.provider) {
    case "anthropic":
      return new AnthropicClient(config);
    case "google":
      return new GoogleClient(config);
    case "deepseek":
      return new OpenAIClient({
        ...config,
        model: config.model || "deepseek-chat",
        baseUrl: config.baseUrl || "https://api.deepseek.com",
      });
    case "openai":
    case "openrouter":
    default:
      return new OpenAIClient(config);
  }
}
