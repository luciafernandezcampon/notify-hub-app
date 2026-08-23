import { z } from "zod";
import { getAIClient } from "@/lib/ai/client";
import { ANALYSIS_SYSTEM_PROMPT, buildAnalysisUserPrompt } from "@/lib/ai/prompts";

const AffectedDocSchema = z.object({
  path: z.string(),
  reason: z.string(),
});

const SuggestionSchema = z.object({
  documentPath: z.string(),
  explanation: z.string(),
  proposedContent: z.string(),
});

const AnalysisResultSchema = z.object({
  requiresDocumentationUpdate: z.boolean(),
  documentationAlreadyUpdated: z.boolean(),
  summary: z.string(),
  impact: z.enum(["low", "medium", "high"]),
  affectedDocs: z.array(AffectedDocSchema),
  suggestions: z.array(SuggestionSchema),
  confidence: z.number().min(0).max(1),
});

export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;
export type AffectedDoc = z.infer<typeof AffectedDocSchema>;
export type AnalysisSuggestion = z.infer<typeof SuggestionSchema>;

export interface DocumentationManifestEntry {
  path: string;
  description?: string;
  relatedPaths?: string[];
  keywords?: string[];
}

export interface AnalyzeChangeInput {
  diff: string;
  changedFiles: string[];
  documentationManifest: DocumentationManifestEntry[];
}

export async function analyzeChange({
  diff,
  changedFiles,
  documentationManifest,
}: AnalyzeChangeInput): Promise<AnalysisResult> {
  const aiClient = getAIClient();

  return aiClient.generateStructured({
    systemPrompt: ANALYSIS_SYSTEM_PROMPT,
    userPrompt: buildAnalysisUserPrompt({ diff, changedFiles, documentationManifest }),
    schema: AnalysisResultSchema,
  });
}
