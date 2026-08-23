import { getDraft, markDraftWritten } from "@/lib/db/drafts";
import { updateRepositoryFile } from "@/lib/github/files";

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

    await updateRepositoryFile({
      path: draft.path,
      content,
      commitMessage: `docs: add/update ${draft.path} via docs-ai`,
    });

    const updated = await markDraftWritten(id);
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
