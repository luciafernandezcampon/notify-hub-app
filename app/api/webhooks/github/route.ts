import crypto from "node:crypto";
import {
  getPullRequestDiff,
  getPullRequestFiles,
} from "@/lib/github/pullRequests";
import { getRepoConfig } from "@/lib/github/client";
import { analyzeChange } from "@/lib/analysis/analyzeChange";
import { generateManifest } from "@/lib/docs/generateManifest";
import { saveAnalysisResult } from "@/lib/db/analyses";
import { publishAnalysisComment } from "@/lib/github/comments";
import { AIClientError } from "@/lib/ai/types";

const PROCESSED_ACTIONS = new Set(["opened", "synchronize", "closed"]);

function isValidSignature(
  payload: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature) return false;

  const expected =
    "sha256=" + crypto.createHmac("sha256", secret).update(payload).digest("hex");

  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);

  if (expectedBuffer.length !== signatureBuffer.length) return false;

  return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
}

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) {
    return Response.json(
      { ok: false, error: "Missing GITHUB_WEBHOOK_SECRET environment variable" },
      { status: 500 }
    );
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");

  if (!isValidSignature(rawBody, signature, secret)) {
    return Response.json({ ok: false, error: "Invalid signature" }, { status: 401 });
  }

  const eventType = request.headers.get("x-github-event");
  if (eventType !== "pull_request") {
    return Response.json({ ok: true, skipped: true, reason: "Not a pull_request event" });
  }

  const payload = JSON.parse(rawBody);
  const action: string = payload.action;

  if (!PROCESSED_ACTIONS.has(action)) {
    return Response.json({
      ok: true,
      skipped: true,
      reason: `Action "${action}" is not processed`,
    });
  }

  const prNumber: number | undefined = payload.pull_request?.number;
  if (typeof prNumber !== "number") {
    return Response.json({
      ok: true,
      skipped: true,
      reason: "Missing pull_request.number",
    });
  }

  if (action === "closed" && payload.pull_request?.merged !== true) {
    return Response.json({
      ok: true,
      skipped: true,
      reason: "PR closed without merging",
    });
  }

  try {
    const { owner, repo } = getRepoConfig();
    const repoSlug = `${owner}/${repo}`;

    const [diff, files, documentationManifest] = await Promise.all([
      getPullRequestDiff(prNumber),
      getPullRequestFiles(prNumber),
      generateManifest(repoSlug),
    ]);

    const changedFiles = files.map((file) => file.filename);

    const result = await analyzeChange({
      diff,
      changedFiles,
      documentationManifest,
    });

    await saveAnalysisResult({
      repo: repoSlug,
      prNumber,
      source: "webhook",
      result,
    });

    await publishAnalysisComment(prNumber, result);

    return Response.json({ ok: true, result });
  } catch (error) {
    if (error instanceof AIClientError) {
      console.error(
        "Webhook analysis failed for PR",
        prNumber,
        "(AI error):",
        error.code,
        error.cause ?? error
      );
    } else {
      console.error("Webhook analysis failed for PR", prNumber, error);
    }
    return Response.json({
      ok: false,
      error: "Analysis failed, acknowledged to avoid retries",
    });
  }
}
