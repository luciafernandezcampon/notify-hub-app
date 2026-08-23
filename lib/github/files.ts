import { getOctokit, getRepoConfig } from "./client";

export interface UpdateRepositoryFileInput {
  path: string;
  content: string;
  commitMessage: string;
  branch?: string;
}

function isNotFoundError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    (error as { status: unknown }).status === 404
  );
}

export async function updateRepositoryFile({
  path,
  content,
  commitMessage,
  branch,
}: UpdateRepositoryFileInput) {
  const octokit = getOctokit();
  const { owner, repo } = getRepoConfig();

  let sha: string | undefined;
  try {
    const existing = await octokit.rest.repos.getContent({
      owner,
      repo,
      path,
      ref: branch,
    });
    if (!Array.isArray(existing.data) && existing.data.type === "file") {
      sha = existing.data.sha;
    }
  } catch (error) {
    if (!isNotFoundError(error)) throw error;
  }

  const { data } = await octokit.rest.repos.createOrUpdateFileContents({
    owner,
    repo,
    path,
    message: commitMessage,
    content: Buffer.from(content, "utf-8").toString("base64"),
    branch,
    sha,
  });

  return data;
}
