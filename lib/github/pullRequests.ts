import { getOctokit, getRepoConfig } from "./client";

export async function getPullRequest(prNumber: number) {
  const octokit = getOctokit();
  const { owner, repo } = getRepoConfig();

  const { data } = await octokit.rest.pulls.get({
    owner,
    repo,
    pull_number: prNumber,
  });

  return data;
}

export async function getPullRequestFiles(prNumber: number) {
  const octokit = getOctokit();
  const { owner, repo } = getRepoConfig();

  const files = await octokit.paginate(octokit.rest.pulls.listFiles, {
    owner,
    repo,
    pull_number: prNumber,
    per_page: 100,
  });

  return files;
}

export async function getPullRequestDiff(prNumber: number): Promise<string> {
  const octokit = getOctokit();
  const { owner, repo } = getRepoConfig();

  const { data } = await octokit.rest.pulls.get({
    owner,
    repo,
    pull_number: prNumber,
    mediaType: {
      format: "diff",
    },
  });

  return data as unknown as string;
}
