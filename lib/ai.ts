import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText, type LanguageModel } from "ai";

/**
 * Configured chat models in priority order for the AI tasks (`design-agent`,
 * `generate-spec`): DeepSeek (paid, most reliable) → OpenRouter → Gemini (free
 * tier, last resort). `generateChatText` tries each in turn, so a quota /
 * rate-limit failure on one falls through to the next. `*_MODEL` env vars
 * override the ids. All three endpoints are OpenAI-compatible.
 */
function chatModels(): LanguageModel[] {
  const models: LanguageModel[] = [];

  if (process.env.DEEPSEEK_API_KEY) {
    const deepseek = createOpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: "https://api.deepseek.com/v1",
    });
    models.push(deepseek(process.env.DEEPSEEK_MODEL ?? "deepseek-chat"));
  }

  if (process.env.OPENROUTER_API_KEY) {
    const openrouter = createOpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: "https://openrouter.ai/api/v1",
    });
    // `openrouter/free` = OpenRouter's auto-router across its free models.
    models.push(openrouter(process.env.OPENROUTER_MODEL ?? "openrouter/free"));
  }

  if (process.env.GEMINI_API_KEY) {
    const google = createGoogleGenerativeAI({
      apiKey: process.env.GEMINI_API_KEY,
    });
    models.push(google(process.env.GEMINI_MODEL ?? "gemini-3.6-flash"));
  }

  if (models.length === 0) {
    throw new Error(
      "No AI provider configured: set DEEPSEEK_API_KEY, OPENROUTER_API_KEY, and/or GEMINI_API_KEY",
    );
  }
  return models;
}

/**
 * Generate text, trying each configured provider in order until one succeeds.
 * Throws the last provider's error only when every provider fails.
 */
export async function generateChatText(options: {
  system?: string;
  prompt: string;
}): Promise<string> {
  const models = chatModels();
  let lastError: unknown;

  for (const model of models) {
    const label = typeof model === "string" ? model : model.modelId;
    try {
      const { text } = await generateText({ model, ...options });
      return text;
    } catch (error) {
      lastError = error;
      console.warn(
        `[ai] provider "${label}" failed, trying next`,
        error instanceof Error ? error.message : error,
      );
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("all AI providers failed");
}
