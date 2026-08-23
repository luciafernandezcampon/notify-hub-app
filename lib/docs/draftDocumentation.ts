import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

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

const RESULT_TOOL_NAME = "propose_documentation_draft";

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

export async function draftDocumentation({
  moduleKey,
  files,
}: DraftDocumentationInput): Promise<DraftSuggestion> {
  const client = getAnthropic();

  const filesSection = files
    .map((file) => `--- ${file.path} ---\n${file.content}`)
    .join("\n\n");

  const message = await client.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 2048,
    system:
      "You are a technical writer creating the first documentation draft for an " +
      "undocumented code module. Base the draft strictly on the provided source files. " +
      "Write clear, concise Markdown. Suggest a documentation file path under docs/.",
    tools: [
      {
        name: RESULT_TOOL_NAME,
        description: "Propose a documentation draft for this module.",
        input_schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            suggestedPath: {
              type: "string",
              description: "Path for the new doc file, e.g. docs/module-name.md",
            },
            reason: {
              type: "string",
              description: "Why this module needs documentation.",
            },
            content: { type: "string", description: "Full Markdown draft content." },
          },
          required: ["title", "suggestedPath", "reason", "content"],
        },
      },
    ],
    tool_choice: { type: "tool", name: RESULT_TOOL_NAME },
    messages: [
      {
        role: "user",
        content: `Module: ${moduleKey}\n\nFiles:\n${filesSection}`,
      },
    ],
  });

  const toolUse = message.content.find(
    (block): block is Anthropic.ToolUseBlock =>
      block.type === "tool_use" && block.name === RESULT_TOOL_NAME
  );

  if (!toolUse) {
    throw new Error("Claude did not return a documentation draft");
  }

  return DraftSuggestionSchema.parse(toolUse.input);
}
