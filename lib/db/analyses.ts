import { prisma } from "./client";
import type { Prisma } from "@prisma/client";
import type { AnalysisResult } from "@/lib/analysis/analyzeChange";

export interface SaveAnalysisResultInput {
  repo: string;
  prNumber: number;
  source: "manual" | "webhook";
  result: AnalysisResult;
}

export async function saveAnalysisResult(input: SaveAnalysisResultInput) {
  return prisma.analysis.create({
    data: {
      repo: input.repo,
      prNumber: input.prNumber,
      source: input.source,
      status: "analyzed",
      impact: input.result.impact,
      summary: input.result.summary,
      resultJson: input.result as unknown as Prisma.InputJsonValue,
    },
  });
}
