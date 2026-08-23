import { getPrisma } from "@/lib/db/client";
import type { DocumentationManifestEntry } from "@/lib/analysis/analyzeChange";

interface ManifestJson {
  documents: DocumentationManifestEntry[];
}

export async function generateManifest(
  repo: string
): Promise<DocumentationManifestEntry[]> {
  const record = await getPrisma().documentationManifest.findUnique({
    where: { repo },
  });

  if (!record) return [];

  const manifest = record.manifestJson as unknown as ManifestJson;
  return manifest.documents ?? [];
}
