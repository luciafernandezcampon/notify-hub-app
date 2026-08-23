import { prisma } from "./client";
import type { DraftSuggestion } from "@/lib/docs/draftDocumentation";

export async function saveDraft(repo: string, suggestion: DraftSuggestion) {
  return prisma.documentationDraft.create({
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
  return prisma.documentationDraft.findMany({
    where: { repo },
    orderBy: { createdAt: "desc" },
  });
}

export function getDraft(id: string) {
  return prisma.documentationDraft.findUnique({ where: { id } });
}

export function editDraft(id: string, finalContent: string) {
  return prisma.documentationDraft.update({
    where: { id },
    data: { finalContent },
  });
}

export function acceptDraft(id: string, finalContent?: string) {
  return prisma.documentationDraft.update({
    where: { id },
    data: {
      status: "accepted",
      ...(finalContent !== undefined ? { finalContent } : {}),
    },
  });
}

export function rejectDraft(id: string) {
  return prisma.documentationDraft.update({
    where: { id },
    data: { status: "rejected" },
  });
}

export function markDraftWritten(id: string, prNumber: number, prUrl: string) {
  return prisma.documentationDraft.update({
    where: { id },
    data: { status: "written", prNumber, prUrl },
  });
}
