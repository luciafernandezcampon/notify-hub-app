import { z } from "zod";
import { getAIClient } from "@/lib/ai/client";

const DraftSuggestionSchema = z.object({
  title: z.string(),
  suggestedPath: z.string(),
  reason: z.string(),
  content: z.string(),
});

export type DraftSuggestion = z.infer<typeof DraftSuggestionSchema>;

export interface ModuleFile {
  path: string;
  content: string;
}

export interface DraftDocumentationInput {
  moduleKey: string;
  files: ModuleFile[];
}

const SYSTEM_PROMPT =
  "You are a technical writer creating the first documentation draft for an " +
  "undocumented code module. Base the draft strictly on the provided source files. " +
  "Write clear, concise Markdown. Suggest a documentation file path under docs/.";

export async function draftDocumentation({
  moduleKey,
  files,
}: DraftDocumentationInput): Promise<DraftSuggestion> {
  const aiClient = getAIClient();

  const filesSection = files
    .map((file) => `--- ${file.path} ---\n${file.content}`)
    .join("\n\n");

  return aiClient.generateStructured({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: `Module: ${moduleKey}\n\nFiles:\n${filesSection}`,
    schema: DraftSuggestionSchema,
  });
}
