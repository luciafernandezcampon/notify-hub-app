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

/**
 * Octokit instance authenticated as an individual user (via their GitHub
 * OAuth access token), for actions that should be attributed to them —
 * e.g. commits/PRs created from the dashboard — instead of the shared
 * service token.
 */
export function getOctokitForToken(accessToken: string): Octokit {
  return new Octokit({ auth: accessToken });
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
