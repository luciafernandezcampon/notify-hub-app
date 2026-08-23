import { getOctokit, getRepoConfig } from "@/lib/github/client";

export async function GET() {
  try {
    const octokit = getOctokit();
    const { owner, repo } = getRepoConfig();

    const { data } = await octokit.rest.repos.get({ owner, repo });

    return Response.json({
      ok: true,
      repo: data.full_name,
      private: data.private,
      defaultBranch: data.default_branch,
    });
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
