import { z } from "zod";
import {
  getPullRequestDiff,
  getPullRequestFiles,
} from "@/lib/github/pullRequests";
import { getRepoConfig } from "@/lib/github/client";
import { analyzeChange } from "@/lib/analysis/analyzeChange";
import { generateManifest } from "@/lib/docs/generateManifest";
import { saveAnalysisResult } from "@/lib/db/analyses";

const RequestSchema = z.object({
  prNumber: z.number().int().positive(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { prNumber } = RequestSchema.parse(body);

    const [diff, files] = await Promise.all([
      getPullRequestDiff(prNumber),
      getPullRequestFiles(prNumber),
    ]);

    const { owner, repo } = getRepoConfig();
    const repoSlug = `${owner}/${repo}`;

    const changedFiles = files.map((file) => file.filename);
    const documentationManifest = await generateManifest(repoSlug);

    const result = await analyzeChange({
      diff,
      changedFiles,
      documentationManifest,
    });

    await saveAnalysisResult({
      repo: repoSlug,
      prNumber,
      source: "manual",
      result,
    });

    return Response.json({ ok: true, result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { ok: false, error: "Invalid request body", issues: error.issues },
        { status: 400 }
      );
    }

    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
