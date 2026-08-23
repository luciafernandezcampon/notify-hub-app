import type { Octokit } from "octokit";
import { getOctokit, getRepoConfig } from "./client";
import { getDefaultBranch } from "./repository";

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

export interface CreatePullRequestInput {
  title: string;
  head: string;
  body?: string;
  base?: string;
  octokit?: Octokit;
}

export async function createPullRequest({
  title,
  head,
  body,
  base,
  octokit = getOctokit(),
}: CreatePullRequestInput) {
  const { owner, repo } = getRepoConfig();
  const baseBranch = base ?? (await getDefaultBranch());

  const { data } = await octokit.rest.pulls.create({
    owner,
    repo,
    title,
    head,
    base: baseBranch,
    body,
  });

  return data;
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
