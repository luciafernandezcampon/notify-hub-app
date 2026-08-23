import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

const AnalysisResultSchema = z.object({
  requiresDocumentationUpdate: z.boolean(),
  documentationAlreadyUpdated: z.boolean(),
  summary: z.string(),
  impact: z.enum(["low", "medium", "high"]),
  affectedDocs: z.array(z.string()),
  suggestions: z.array(z.string()),
  confidence: z.number().min(0).max(1),
});

export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;

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

const RESULT_TOOL_NAME = "report_analysis";

let anthropic: Anthropic | null = null;

function getAnthropic(): Anthropic {
  if (anthropic) return anthropic;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("Missing ANTHROPIC_API_KEY environment variable");
  }

  anthropic = new Anthropic({ apiKey });
  return anthropic;
}

function buildManifestSection(
  documentationManifest: DocumentationManifestEntry[]
): string {
  if (documentationManifest.length === 0) {
    return "(no documentation manifest provided)";
  }

  return documentationManifest
    .map((entry) => {
      const parts = [`- ${entry.path}`];
      if (entry.description) parts.push(`description: ${entry.description}`);
      if (entry.relatedPaths?.length)
        parts.push(`relatedPaths: ${entry.relatedPaths.join(", ")}`);
      if (entry.keywords?.length)
        parts.push(`keywords: ${entry.keywords.join(", ")}`);
      return parts.join(" | ");
    })
    .join("\n");
}

export async function analyzeChange({
  diff,
  changedFiles,
  documentationManifest,
}: AnalyzeChangeInput): Promise<AnalysisResult> {
  const client = getAnthropic();

  const message = await client.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 2048,
    system:
      "You are a documentation impact analyst. Given a code change (diff, changed files) " +
      "and the project's documentation manifest, determine whether documentation needs to be " +
      "updated as a result of the change, and whether the change already updates the relevant docs. " +
      "Only reference documentation paths that appear in the manifest. Be conservative: only mark " +
      "requiresDocumentationUpdate as true when the change affects behavior, APIs, configuration, or " +
      "usage that documentation describes.",
    tools: [
      {
        name: RESULT_TOOL_NAME,
        description: "Report the documentation impact analysis for this change.",
        input_schema: {
          type: "object",
          properties: {
            requiresDocumentationUpdate: { type: "boolean" },
            documentationAlreadyUpdated: { type: "boolean" },
            summary: { type: "string" },
            impact: { type: "string", enum: ["low", "medium", "high"] },
            affectedDocs: { type: "array", items: { type: "string" } },
            suggestions: { type: "array", items: { type: "string" } },
            confidence: { type: "number" },
          },
          required: [
            "requiresDocumentationUpdate",
            "documentationAlreadyUpdated",
            "summary",
            "impact",
            "affectedDocs",
            "suggestions",
            "confidence",
          ],
        },
      },
    ],
    tool_choice: { type: "tool", name: RESULT_TOOL_NAME },
    messages: [
      {
        role: "user",
        content: [
          `Documentation manifest:\n${buildManifestSection(documentationManifest)}`,
          `Changed files:\n${changedFiles.map((f) => `- ${f}`).join("\n")}`,
          `Diff:\n${diff}`,
        ].join("\n\n"),
      },
    ],
  });

  const toolUse = message.content.find(
    (block): block is Anthropic.ToolUseBlock =>
      block.type === "tool_use" && block.name === RESULT_TOOL_NAME
  );

  if (!toolUse) {
    throw new Error("Claude did not return a documentation analysis result");
  }

  return AnalysisResultSchema.parse(toolUse.input);
}
