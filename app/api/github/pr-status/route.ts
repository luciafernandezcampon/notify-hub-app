import { getPullRequest } from "@/lib/github/pullRequests";

export type PullRequestState = "open" | "merged" | "closed" | "unknown";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const numbersParam = url.searchParams.get("numbers") ?? "";

    const prNumbers = Array.from(
      new Set(
        numbersParam
          .split(",")
          .map((n) => Number(n.trim()))
          .filter((n) => Number.isInteger(n) && n > 0)
      )
    );

    const statuses = await Promise.all(
      prNumbers.map(async (prNumber) => {
        try {
          const pr = await getPullRequest(prNumber);
          const state: PullRequestState = pr.merged
            ? "merged"
            : pr.state === "closed"
              ? "closed"
              : "open";
          return {
            prNumber,
            state,
            author: pr.user?.login ?? null,
            authorAvatarUrl: pr.user?.avatar_url ?? null,
          };
        } catch {
          return {
            prNumber,
            state: "unknown" as PullRequestState,
            author: null,
            authorAvatarUrl: null,
          };
        }
      })
    );

    return Response.json({ ok: true, statuses });
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
