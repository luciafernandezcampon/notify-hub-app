import { getOctokit, getRepoConfig } from "./client";

export interface RepoTreeEntry {
  path: string;
  type: "blob" | "tree";
  size?: number;
}

export async function getDefaultBranch(): Promise<string> {
  const octokit = getOctokit();
  const { owner, repo } = getRepoConfig();

  const { data } = await octokit.rest.repos.get({ owner, repo });
  return data.default_branch;
}

export async function getRepoTree(): Promise<RepoTreeEntry[]> {
  const octokit = getOctokit();
  const { owner, repo } = getRepoConfig();
  const branch = await getDefaultBranch();

  const { data } = await octokit.rest.git.getTree({
    owner,
    repo,
    tree_sha: branch,
    recursive: "true",
  });

  return data.tree
    .filter(
      (entry): entry is typeof entry & { path: string; type: "blob" | "tree" } =>
        typeof entry.path === "string" &&
        (entry.type === "blob" || entry.type === "tree")
    )
    .map((entry) => ({
      path: entry.path,
      type: entry.type,
      size: entry.size,
    }));
}

export async function getFileContent(path: string): Promise<string> {
  const octokit = getOctokit();
  const { owner, repo } = getRepoConfig();

  const { data } = await octokit.rest.repos.getContent({ owner, repo, path });

  if (Array.isArray(data) || data.type !== "file" || !data.content) {
    throw new Error(`"${path}" is not a readable file`);
  }

  return Buffer.from(data.content, "base64").toString("utf-8");
}
