import { generateDocs } from "@/lib/docs/generateDocs";

export async function POST() {
  try {
    const drafts = await generateDocs();
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
