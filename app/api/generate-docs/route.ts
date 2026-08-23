import { generateDocs } from "@/lib/docs/generateDocs";
import { AIClientError, publicAIErrorMessage, aiErrorHttpStatus } from "@/lib/ai/types";

export async function POST() {
  try {
    const drafts = await generateDocs();
    return Response.json({ ok: true, drafts });
  } catch (error) {
    if (error instanceof AIClientError) {
      console.error("generate-docs failed (AI error):", error.code, error.cause ?? error);
      return Response.json(
        { ok: false, error: publicAIErrorMessage(error) },
        { status: aiErrorHttpStatus(error) }
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
