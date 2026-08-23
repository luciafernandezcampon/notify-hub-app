import type { AIClient } from "./types";
import { createGeminiClient } from "./geminiClient";

let client: AIClient | null = null;

export function getAIClient(): AIClient {
  if (!client) {
    client = createGeminiClient();
  }
  return client;
}
