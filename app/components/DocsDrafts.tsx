"use client";

import { useEffect, useState } from "react";

type DraftStatus = "proposed" | "accepted" | "rejected" | "written";

interface Draft {
  id: string;
  repo: string;
  path: string;
  title: string | null;
  reason: string | null;
  originalContent: string | null;
  proposedContent: string;
  finalContent: string | null;
  status: DraftStatus;
  createdAt: string;
  updatedAt: string;
}

type DraftsResponse = { ok: true; drafts: Draft[] } | { ok: false; error: string };
type DraftResponse = { ok: true; draft: Draft } | { ok: false; error: string };

const STATUS_LABELS: Record<DraftStatus, string> = {
  proposed: "Propuesto",
  accepted: "Aceptado",
  rejected: "Rechazado",
  written: "Escrito en GitHub",
};

export default function DocsDrafts() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [editedContent, setEditedContent] = useState<Record<string, string>>({});
  const [generating, setGenerating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadDrafts() {
    const res = await fetch("/api/drafts");
    const data: DraftsResponse = await res.json();
    if (data.ok) {
      setDrafts(data.drafts);
    } else {
      setError(data.error);
    }
  }

  useEffect(() => {
    let cancelled = false;

    fetch("/api/drafts")
      .then((res) => res.json())
      .then((data: DraftsResponse) => {
        if (cancelled) return;
        if (data.ok) {
          setDrafts(data.drafts);
        } else {
          setError(data.error);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/generate-docs", { method: "POST" });
      const data: { ok: true; drafts: Draft[] } | { ok: false; error: string } =
        await res.json();
      if (data.ok) {
        await loadDrafts();
      } else {
        setError(data.error);
      }
    } finally {
      setGenerating(false);
    }
  }

  function contentFor(draft: Draft): string {
    return editedContent[draft.id] ?? draft.finalContent ?? draft.proposedContent;
  }

  async function handleAction(
    draft: Draft,
    action: "edit" | "accept" | "reject" | "write"
  ) {
    setBusyId(draft.id);
    setError(null);
    try {
      if (action === "write") {
        const res = await fetch(`/api/drafts/${draft.id}/write`, { method: "POST" });
        const data: DraftResponse = await res.json();
        if (!data.ok) {
          setError(data.error);
          return;
        }
      } else {
        const body =
          action === "reject"
            ? { action: "reject" as const }
            : { action, content: contentFor(draft) };

        const res = await fetch(`/api/drafts/${draft.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data: DraftResponse = await res.json();
        if (!data.ok) {
          setError(data.error);
          return;
        }
      }
      await loadDrafts();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-semibold text-black dark:text-zinc-50">
          Documentación inicial
        </h2>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="rounded bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {generating ? "Generando..." : "Generar documentación inicial"}
        </button>
      </div>

      {error && (
        <div className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          {error}
        </div>
      )}

      {drafts.length === 0 && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          No hay borradores todavía.
        </p>
      )}

      <div className="flex flex-col gap-4">
        {drafts.map((draft) => (
          <div
            key={draft.id}
            className="flex flex-col gap-3 rounded border border-zinc-300 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-medium text-black dark:text-zinc-50">
                  {draft.title ?? draft.path}
                </p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">{draft.path}</p>
              </div>
              <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                {STATUS_LABELS[draft.status]}
              </span>
            </div>

            {draft.reason && (
              <p className="text-sm text-zinc-700 dark:text-zinc-300">{draft.reason}</p>
            )}

            <textarea
              value={contentFor(draft)}
              onChange={(e) =>
                setEditedContent((prev) => ({ ...prev, [draft.id]: e.target.value }))
              }
              rows={10}
              className="w-full rounded border border-zinc-300 bg-zinc-50 p-2 font-mono text-xs text-black dark:border-zinc-700 dark:bg-black dark:text-zinc-100"
              disabled={draft.status === "written"}
            />

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleAction(draft, "edit")}
                disabled={busyId === draft.id || draft.status === "written"}
                className="rounded border border-zinc-300 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-zinc-700"
              >
                Guardar edición
              </button>
              <button
                onClick={() => handleAction(draft, "accept")}
                disabled={busyId === draft.id || draft.status === "written"}
                className="rounded bg-green-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
              >
                Aceptar
              </button>
              <button
                onClick={() => handleAction(draft, "reject")}
                disabled={busyId === draft.id || draft.status === "written"}
                className="rounded bg-red-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
              >
                Rechazar
              </button>
              {draft.status === "accepted" && (
                <button
                  onClick={() => handleAction(draft, "write")}
                  disabled={busyId === draft.id}
                  className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
                >
                  Escribir en GitHub
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
