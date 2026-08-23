import type { DocumentationManifestEntry } from "@/lib/analysis/analyzeChange";

export const ANALYSIS_SYSTEM_PROMPT =
  "You are a documentation impact analyst. Given a code change (diff, changed files) " +
  "and the project's documentation manifest, determine whether documentation needs to be " +
  "updated as a result of the change, and whether the change already updates the relevant docs. " +
  "Only reference documentation paths that appear in the manifest. Be conservative: only mark " +
  "requiresDocumentationUpdate as true when the change affects behavior, APIs, configuration, or " +
  "usage that documentation describes.";

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

export interface BuildAnalysisUserPromptInput {
  diff: string;
  changedFiles: string[];
  documentationManifest: DocumentationManifestEntry[];
}

export function buildAnalysisUserPrompt({
  diff,
  changedFiles,
  documentationManifest,
}: BuildAnalysisUserPromptInput): string {
  return [
    `Documentation manifest:\n${buildManifestSection(documentationManifest)}`,
    `Changed files:\n${changedFiles.map((f) => `- ${f}`).join("\n")}`,
    `Diff:\n${diff}`,
  ].join("\n\n");
}
