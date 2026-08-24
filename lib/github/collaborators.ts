import { getOctokit, getRepoConfig } from "./client";

function isNotFoundError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    (error as { status: unknown }).status === 404
  );
}

export async function isCollaborator(username: string): Promise<boolean> {
  const octokit = getOctokit();
  const { owner, repo } = getRepoConfig();

  try {
    await octokit.rest.repos.checkCollaborator({ owner, repo, username });
    return true;
  } catch (error) {
    if (isNotFoundError(error)) return false;
    throw error;
  }
}
