"use client";

import { useEffect, useState } from "react";

interface Draft {
  id: string;
  path: string;
  title: string | null;
  status: "proposed" | "accepted" | "rejected" | "written";
  prNumber: number | null;
  prUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

type DraftsResponse = { ok: true; drafts: Draft[] } | { ok: false; error: string };

/**
 * Every PR currently comes from the "generate-docs" workflow (accept a
 * documentation draft → write it to GitHub). This lookup exists so that
 * future workflows (e.g. writing a doc suggested directly from a PR
 * analysis) can register their own label without restructuring the panel.
 */
function getWorkflowLabel(): string {
  return "Documentación inicial (generate-docs)";
}

function branchNameFor(draftId: string): string {
  return `docs-ai/${draftId}`;
}

export default function PullRequestsPanel() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function load() {
    setLoading(true);
    fetch("/api/drafts")
      .then((res) => res.json())
      .then((data: DraftsResponse) => {
        if (data.ok) {
          setDrafts(data.drafts);
          setError(null);
        } else {
          setError(data.error);
        }
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    let cancelled = false;

    fetch("/api/drafts")
      .then((res) => res.json())
      .then((data: DraftsResponse) => {
        if (cancelled) return;
        if (data.ok) {
          setDrafts(data.drafts);
          setError(null);
        } else {
          setError(data.error);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const pullRequests = drafts.filter((draft) => draft.prUrl && draft.prNumber);

  const groups = new Map<string, Draft[]>();
  for (const draft of pullRequests) {
    const key = getWorkflowLabel();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(draft);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-semibold text-black dark:text-zinc-50">
          Pull Requests creados
        </h2>
        <button
          onClick={load}
          disabled={loading}
          className="rounded border border-fuchsia-300 px-3 py-1.5 text-sm text-fuchsia-700 hover:bg-fuchsia-50 disabled:opacity-50 dark:border-fuchsia-800 dark:text-fuchsia-300 dark:hover:bg-fuchsia-950"
        >
          {loading ? "Actualizando..." : "Actualizar"}
        </button>
      </div>

      {error && (
        <div className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          {error}
        </div>
      )}

      {pullRequests.length === 0 && !error && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Todavía no se creó ningún PR. Aceptá un borrador en &ldquo;Documentación inicial&rdquo;
          y usá &ldquo;Crear PR en GitHub&rdquo;.
        </p>
      )}

      {Array.from(groups.entries()).map(([workflow, items]) => (
        <div key={workflow} className="flex flex-col gap-2">
          <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            {workflow} · {items.length}
          </h3>

          <div className="overflow-x-auto rounded border border-zinc-300 dark:border-zinc-700">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                <tr>
                  <th className="px-3 py-2 font-medium">PR</th>
                  <th className="px-3 py-2 font-medium">Título</th>
                  <th className="px-3 py-2 font-medium">Archivo</th>
                  <th className="px-3 py-2 font-medium">Rama</th>
                  <th className="px-3 py-2 font-medium">Creado</th>
                </tr>
              </thead>
              <tbody>
                {items.map((draft) => (
                  <tr
                    key={draft.id}
                    className="border-t border-zinc-200 dark:border-zinc-800"
                  >
                    <td className="px-3 py-2">
                      <a
                        href={draft.prUrl ?? undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-violet-700 hover:underline dark:text-violet-400"
                      >
                        #{draft.prNumber}
                      </a>
                    </td>
                    <td className="px-3 py-2 text-black dark:text-zinc-100">
                      {draft.title ?? draft.path}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-zinc-600 dark:text-zinc-400">
                      {draft.path}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-zinc-600 dark:text-zinc-400">
                      {branchNameFor(draft.id)}
                    </td>
                    <td className="px-3 py-2 text-zinc-500 dark:text-zinc-400">
                      {new Date(draft.createdAt).toLocaleString("es-AR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
