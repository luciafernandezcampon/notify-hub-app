import { getPrisma } from "./client";
import type { DraftSuggestion } from "@/lib/docs/draftDocumentation";

export async function saveDraft(repo: string, suggestion: DraftSuggestion) {
  return getPrisma().documentationDraft.create({
    data: {
      repo,
      path: suggestion.suggestedPath,
      title: suggestion.title,
      reason: suggestion.reason,
      proposedContent: suggestion.content,
    },
  });
}

export function listDrafts(repo: string) {
  return getPrisma().documentationDraft.findMany({
    where: { repo },
    orderBy: { createdAt: "desc" },
  });
}

export function getDraft(id: string) {
  return getPrisma().documentationDraft.findUnique({ where: { id } });
}

export function editDraft(id: string, finalContent: string) {
  return getPrisma().documentationDraft.update({
    where: { id },
    data: { finalContent },
  });
}

export function acceptDraft(id: string, finalContent?: string) {
  return getPrisma().documentationDraft.update({
    where: { id },
    data: {
      status: "accepted",
      ...(finalContent !== undefined ? { finalContent } : {}),
    },
  });
}

export function rejectDraft(id: string) {
  return getPrisma().documentationDraft.update({
    where: { id },
    data: { status: "rejected" },
  });
}

export function markDraftWritten(id: string, prNumber: number, prUrl: string) {
  return getPrisma().documentationDraft.update({
    where: { id },
    data: { status: "written", prNumber, prUrl },
  });
}
