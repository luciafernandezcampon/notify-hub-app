import { getOctokit, getRepoConfig } from "./client";
import type { AnalysisResult } from "@/lib/analysis/analyzeChange";

const MARKER = "<!-- docs-ai-analysis -->";

const IMPACT_LABELS: Record<AnalysisResult["impact"], string> = {
  low: "Bajito v2",
  medium: "Medio",
  high: "Alto",
};

function formatReason(result: AnalysisResult): string {
  if (!result.requiresDocumentationUpdate) {
    return "Este cambio no requiere actualizar documentación.";
  }
  if (result.documentationAlreadyUpdated) {
    return "Este cambio requiere actualizar documentación y este PR ya la actualiza. ✅";
  }
  return "Este cambio requiere actualizar documentación y todavía no lo hace. ⚠️";
}

export function formatAnalysisComment(result: AnalysisResult): string {
  const lines: string[] = [
    MARKER,
    "## 📄 Análisis de documentación",
    "",
    `**Resumen:** ${result.summary}`,
    `**Impacto:** ${IMPACT_LABELS[result.impact]}`,
    `**Motivo:** ${formatReason(result)}`,
  ];

  if (result.affectedDocs.length > 0) {
    lines.push("", "**Documentación afectada:**");
    for (const doc of result.affectedDocs) lines.push(`- ${doc}`);
  }

  if (result.suggestions.length > 0) {
    lines.push("", "**Sugerencias:**");
    for (const suggestion of result.suggestions) lines.push(`- ${suggestion}`);
  }

  lines.push("", `<sub>Confianza: ${Math.round(result.confidence * 100)}%</sub>`);

  return lines.join("\n");
}

export async function publishAnalysisComment(
  prNumber: number,
  result: AnalysisResult
): Promise<void> {
  const octokit = getOctokit();
  const { owner, repo } = getRepoConfig();
  const body = formatAnalysisComment(result);

  const comments = await octokit.paginate(octokit.rest.issues.listComments, {
    owner,
    repo,
    issue_number: prNumber,
    per_page: 100,
  });

  const existing = comments.find((comment) => comment.body?.includes(MARKER));

  if (existing) {
    await octokit.rest.issues.updateComment({
      owner,
      repo,
      comment_id: existing.id,
      body,
    });
    return;
  }

  await octokit.rest.issues.createComment({
    owner,
    repo,
    issue_number: prNumber,
    body,
  });
}
