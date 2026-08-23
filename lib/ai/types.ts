import type { ZodType } from "zod";

export interface GenerateStructuredInput<T> {
  systemPrompt: string;
  userPrompt: string;
  schema: ZodType<T>;
}

export interface AIClient {
  generateStructured<T>(input: GenerateStructuredInput<T>): Promise<T>;
  ping(): Promise<{ model: string }>;
}

export type AIErrorCode =
  | "missing_api_key"
  | "invalid_model"
  | "rate_limited"
  | "timeout"
  | "provider_error"
  | "invalid_json"
  | "schema_validation_failed";

export class AIClientError extends Error {
  readonly code: AIErrorCode;

  constructor(code: AIErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "AIClientError";
    this.code = code;
  }
}

const PUBLIC_MESSAGES: Record<AIErrorCode, string> = {
  missing_api_key: "El servicio de IA no está configurado correctamente.",
  invalid_model: "El modelo de IA configurado no está disponible.",
  rate_limited: "El servicio de IA está saturado. Probá de nuevo en unos minutos.",
  timeout: "El servicio de IA tardó demasiado en responder. Probá de nuevo.",
  provider_error: "El servicio de IA no pudo procesar la solicitud.",
  invalid_json: "El servicio de IA devolvió una respuesta inválida.",
  schema_validation_failed:
    "El servicio de IA devolvió una respuesta con un formato inesperado.",
};

export function publicAIErrorMessage(error: AIClientError): string {
  return PUBLIC_MESSAGES[error.code];
}

export function aiErrorHttpStatus(error: AIClientError): number {
  switch (error.code) {
    case "rate_limited":
      return 429;
    case "timeout":
      return 504;
    default:
      return 502;
  }
}
