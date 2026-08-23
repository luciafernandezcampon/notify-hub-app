import { getRepoConfig } from "@/lib/github/client";
import { listAnalyses } from "@/lib/db/analyses";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { owner, repo } = getRepoConfig();
    const url = new URL(request.url);

    const sourceParam = url.searchParams.get("source");
    const source =
      sourceParam === "manual" || sourceParam === "webhook" ? sourceParam : undefined;

    const limitParam = Number(url.searchParams.get("limit"));
    const limit = Number.isInteger(limitParam) && limitParam > 0 ? limitParam : undefined;

    const analyses = await listAnalyses({
      repo: `${owner}/${repo}`,
      source,
      limit,
    });

    const withPrUrl = analyses.map((analysis) => ({
      ...analysis,
      prUrl: `https://github.com/${owner}/${repo}/pull/${analysis.prNumber}`,
    }));

    return Response.json({ ok: true, analyses: withPrUrl });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
