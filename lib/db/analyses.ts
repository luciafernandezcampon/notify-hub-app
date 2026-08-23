import { getPrisma } from "./client";
import type { Prisma } from "@prisma/client";
import type { AnalysisResult } from "@/lib/analysis/analyzeChange";

export interface SaveAnalysisResultInput {
  repo: string;
  prNumber: number;
  source: "manual" | "webhook";
  result: AnalysisResult;
}

export async function saveAnalysisResult(input: SaveAnalysisResultInput) {
  return getPrisma().analysis.create({
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

export interface ListAnalysesOptions {
  repo: string;
  source?: "manual" | "webhook";
  limit?: number;
}

export function listAnalyses({ repo, source, limit = 10 }: ListAnalysesOptions) {
  return getPrisma().analysis.findMany({
    where: { repo, ...(source ? { source } : {}) },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      prNumber: true,
      source: true,
      status: true,
      impact: true,
      summary: true,
      createdAt: true,
    },
  });
}
