import { getAIClient } from "@/lib/ai/client";
import { AIClientError, publicAIErrorMessage, aiErrorHttpStatus } from "@/lib/ai/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { model } = await getAIClient().ping();
    return Response.json({ ok: true, provider: "gemini", model });
  } catch (error) {
    if (error instanceof AIClientError) {
      console.error("ping-ai failed:", error.code, error.cause ?? error);
      return Response.json(
        { ok: false, provider: "gemini", error: publicAIErrorMessage(error) },
        { status: aiErrorHttpStatus(error) }
      );
    }

    console.error("ping-ai failed:", error);
    return Response.json(
      { ok: false, provider: "gemini", error: "Unknown error" },
      { status: 500 }
    );
  }
}
