import { GoogleGenAI, ApiError } from "@google/genai";
import { z } from "zod";
import { AIClientError } from "./types";
import type { AIClient, GenerateStructuredInput } from "./types";

const REQUEST_TIMEOUT_MS = 60_000;
const PING_MAX_OUTPUT_TOKENS = 8;

interface GeminiConfig {
  apiKey: string;
  model: string;
}

function getConfig(): GeminiConfig {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new AIClientError(
      "missing_api_key",
      "Missing GEMINI_API_KEY environment variable"
    );
  }

  const model = process.env.GEMINI_MODEL;
  if (!model) {
    throw new AIClientError(
      "invalid_model",
      "Missing GEMINI_MODEL environment variable"
    );
  }

  return { apiKey, model };
}

function mapError(error: unknown): AIClientError {
  if (error instanceof ApiError) {
    if (error.status === 401 || error.status === 403) {
      return new AIClientError(
        "missing_api_key",
        "Gemini rejected the configured API key",
        { cause: error }
      );
    }
    if (error.status === 404) {
      return new AIClientError(
        "invalid_model",
        "The configured Gemini model was not found",
        { cause: error }
      );
    }
    if (error.status === 429) {
      return new AIClientError("rate_limited", "Gemini rate limit exceeded", {
        cause: error,
      });
    }
    if (error.status === 408 || error.status === 504) {
      return new AIClientError("timeout", "Gemini request timed out", {
        cause: error,
      });
    }
    return new AIClientError(
      "provider_error",
      `Gemini request failed with status ${error.status}`,
      { cause: error }
    );
  }

  if (
    error instanceof Error &&
    (error.name === "AbortError" || /timeout/i.test(error.message))
  ) {
    return new AIClientError("timeout", "Gemini request timed out", {
      cause: error,
    });
  }

  return new AIClientError("provider_error", "Gemini request failed", {
    cause: error,
  });
}

export function createGeminiClient(): AIClient {
  return {
    async generateStructured<T>({
      systemPrompt,
      userPrompt,
      schema,
    }: GenerateStructuredInput<T>): Promise<T> {
      const { apiKey, model } = getConfig();
      const ai = new GoogleGenAI({ apiKey });

      let responseText: string | undefined;
      try {
        const response = await ai.models.generateContent({
          model,
          contents: userPrompt,
          config: {
            systemInstruction: systemPrompt,
            responseMimeType: "application/json",
            responseJsonSchema: z.toJSONSchema(schema, {
              target: "draft-2020-12",
            }),
            httpOptions: { timeout: REQUEST_TIMEOUT_MS },
          },
        });
        responseText = response.text;
      } catch (error) {
        throw mapError(error);
      }

      if (!responseText) {
        throw new AIClientError(
          "invalid_json",
          "Gemini returned an empty response"
        );
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(responseText);
      } catch (error) {
        throw new AIClientError(
          "invalid_json",
          "Gemini returned a response that is not valid JSON",
          { cause: error }
        );
      }

      const result = schema.safeParse(parsed);
      if (!result.success) {
        throw new AIClientError(
          "schema_validation_failed",
          "Gemini's response did not match the expected schema",
          { cause: result.error }
        );
      }

      return result.data;
    },

    async ping(): Promise<{ model: string }> {
      const { apiKey, model } = getConfig();
      const ai = new GoogleGenAI({ apiKey });

      try {
        await ai.models.generateContent({
          model,
          contents: "ping",
          config: {
            maxOutputTokens: PING_MAX_OUTPUT_TOKENS,
            httpOptions: { timeout: REQUEST_TIMEOUT_MS },
          },
        });
      } catch (error) {
        throw mapError(error);
      }

      return { model };
    },
  };
}
