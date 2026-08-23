import { Octokit } from "octokit";

let octokit: Octokit | null = null;

export function getOctokit(): Octokit {
  if (octokit) return octokit;

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error("Missing GITHUB_TOKEN environment variable");
  }

  octokit = new Octokit({ auth: token });
  return octokit;
}

export function getRepoConfig() {
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;

  if (!owner || !repo) {
    throw new Error(
      "Missing GITHUB_OWNER or GITHUB_REPO environment variable"
    );
  }

  return { owner, repo };
}
