import { getRepoConfig } from "@/lib/github/client";
import { listDrafts } from "@/lib/db/drafts";

export async function GET() {
  try {
    const { owner, repo } = getRepoConfig();
    const drafts = await listDrafts(`${owner}/${repo}`);
    return Response.json({ ok: true, drafts });
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
