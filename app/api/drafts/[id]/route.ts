import { z } from "zod";
import {
  getDraft,
  editDraft,
  acceptDraft,
  rejectDraft,
} from "@/lib/db/drafts";

const PatchSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("edit"), content: z.string().min(1) }),
  z.object({ action: z.literal("accept"), content: z.string().optional() }),
  z.object({ action: z.literal("reject") }),
]);

export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/drafts/[id]">
) {
  try {
    const { id } = await ctx.params;
    const body = PatchSchema.parse(await request.json());

    const existing = await getDraft(id);
    if (!existing) {
      return Response.json({ ok: false, error: "Draft not found" }, { status: 404 });
    }

    let draft;
    switch (body.action) {
      case "edit":
        draft = await editDraft(id, body.content);
        break;
      case "accept":
        draft = await acceptDraft(id, body.content);
        break;
      case "reject":
        draft = await rejectDraft(id);
        break;
    }

    return Response.json({ ok: true, draft });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { ok: false, error: "Invalid request body", issues: error.issues },
        { status: 400 }
      );
    }

    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
