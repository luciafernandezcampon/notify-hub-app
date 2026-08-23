import { getDraft, markDraftWritten } from "@/lib/db/drafts";
import { updateRepositoryFile } from "@/lib/github/files";
import { createBranch } from "@/lib/github/repository";
import { createPullRequest } from "@/lib/github/pullRequests";

export async function POST(
  _request: Request,
  ctx: RouteContext<"/api/drafts/[id]/write">
) {
  try {
    const { id } = await ctx.params;
    const draft = await getDraft(id);

    if (!draft) {
      return Response.json({ ok: false, error: "Draft not found" }, { status: 404 });
    }

    if (draft.status !== "accepted") {
      return Response.json(
        { ok: false, error: "Draft must be accepted before writing to GitHub" },
        { status: 409 }
      );
    }

    const content = draft.finalContent ?? draft.proposedContent;
    const branchName = `docs-ai/${draft.id}`;

    await createBranch(branchName);

    await updateRepositoryFile({
      path: draft.path,
      content,
      commitMessage: `docs: add/update ${draft.path} via docs-ai`,
      branch: branchName,
    });

    const pr = await createPullRequest({
      title: `docs: ${draft.title ?? draft.path}`,
      head: branchName,
      body: [
        draft.reason ? `**Motivo:** ${draft.reason}` : null,
        "",
        "_Generado por docs-ai. Revisá el contenido antes de mergear._",
      ]
        .filter((line) => line !== null)
        .join("\n"),
    });

    const updated = await markDraftWritten(id, pr.number, pr.html_url);
    return Response.json({ ok: true, draft: updated });
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
