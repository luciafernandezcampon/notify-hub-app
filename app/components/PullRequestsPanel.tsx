"use client";

import { useEffect, useState } from "react";

type Source = "manual" | "webhook" | "generate-docs";

const SOURCE_ORDER: Source[] = ["generate-docs", "webhook", "manual"];

interface MergedRow {
  prNumber: number;
  prUrl: string;
  sources: Source[];
  title: string;
  path: string | null;
  branch: string | null;
  firstSeenAt: string;
  lastActivityAt: string;
}

interface AnalysisItem {
  id: string;
  prNumber: number;
  source: "manual" | "webhook";
  summary: string | null;
  createdAt: string;
  prUrl: string;
}

interface Draft {
  id: string;
  path: string;
  title: string | null;
  status: "proposed" | "accepted" | "rejected" | "written";
  prNumber: number | null;
  prUrl: string | null;
  createdAt: string;
}

type AnalysesResponse = { ok: true; analyses: AnalysisItem[] } | { ok: false; error: string };
type DraftsResponse = { ok: true; drafts: Draft[] } | { ok: false; error: string };

const SOURCE_LABELS: Record<Source, string> = {
  manual: "Manual",
  webhook: "Webhook",
  "generate-docs": "Documentación inicial",
};

const SOURCE_BADGE_STYLES: Record<Source, string> = {
  manual: "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200",
  webhook: "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-950 dark:text-fuchsia-300",
  "generate-docs": "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300",
};

type PullRequestState = "open" | "merged" | "closed" | "unknown";

const STATUS_LABELS: Record<PullRequestState, string> = {
  open: "Abierto",
  merged: "Mergeado",
  closed: "Cerrado",
  unknown: "?",
};

const STATUS_BADGE_STYLES: Record<PullRequestState, string> = {
  open: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  merged: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300",
  closed: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  unknown: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
};

interface PrStatusEntry {
  prNumber: number;
  state: PullRequestState;
  author: string | null;
  authorAvatarUrl: string | null;
  headBranch: string | null;
  files: string[];
}

function formatFiles(files: string[] | undefined): string {
  if (!files || files.length === 0) return "—";
  if (files.length <= 2) return files.join(", ");
  return `${files.slice(0, 2).join(", ")} +${files.length - 2} más`;
}

interface PrStatusResponse {
  ok: boolean;
  statuses?: PrStatusEntry[];
  error?: string;
}

function branchNameFor(draftId: string): string {
  return `docs-ai/${draftId}`;
}

function mergeRows(analyses: AnalysisItem[], drafts: Draft[]): MergedRow[] {
  const byPr = new Map<number, MergedRow>();

  function upsert(
    prNumber: number,
    prUrl: string,
    source: Source,
    title: string,
    path: string | null,
    branch: string | null,
    createdAt: string,
    titlePriority: boolean
  ) {
    const existing = byPr.get(prNumber);
    if (!existing) {
      byPr.set(prNumber, {
        prNumber,
        prUrl,
        sources: [source],
        title,
        path,
        branch,
        firstSeenAt: createdAt,
        lastActivityAt: createdAt,
      });
      return;
    }

    if (!existing.sources.includes(source)) existing.sources.push(source);
    if (titlePriority) existing.title = title;
    if (path) existing.path = path;
    if (branch) existing.branch = branch;
    if (createdAt < existing.firstSeenAt) existing.firstSeenAt = createdAt;
    if (createdAt > existing.lastActivityAt) existing.lastActivityAt = createdAt;
  }

  // Analyses first, newest first, so the most recent summary wins by default.
  for (const a of analyses) {
    upsert(a.prNumber, a.prUrl, a.source, a.summary ?? `PR #${a.prNumber}`, null, null, a.createdAt, false);
  }

  // Draft titles always take priority — they're more specific than a diff summary.
  for (const d of drafts) {
    if (!d.prNumber || !d.prUrl) continue;
    upsert(
      d.prNumber,
      d.prUrl,
      "generate-docs",
      d.title ?? d.path,
      d.path,
      branchNameFor(d.id),
      d.createdAt,
      true
    );
  }

  return Array.from(byPr.values()).sort((a, b) =>
    b.lastActivityAt.localeCompare(a.lastActivityAt)
  );
}

export default function PullRequestsPanel() {
  const [rows, setRows] = useState<MergedRow[]>([]);
  const [statuses, setStatuses] = useState<Record<number, PrStatusEntry>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [statusLoading, setStatusLoading] = useState(false);

  async function fetchRows(): Promise<MergedRow[] | { error: string }> {
    const [analysesRes, draftsRes] = await Promise.all([
      fetch("/api/analyses?limit=50"),
      fetch("/api/drafts"),
    ]);
    const analysesData: AnalysesResponse = await analysesRes.json();
    const draftsData: DraftsResponse = await draftsRes.json();

    if (!analysesData.ok) return { error: analysesData.error };
    if (!draftsData.ok) return { error: draftsData.error };

    return mergeRows(analysesData.analyses, draftsData.drafts);
  }

  async function fetchStatuses(prNumbers: number[]) {
    if (prNumbers.length === 0) return;
    setStatusLoading(true);
    try {
      const res = await fetch(`/api/github/pr-status?numbers=${prNumbers.join(",")}`);
      const data: PrStatusResponse = await res.json();
      if (data.ok && data.statuses) {
        setStatuses((prev) => {
          const next = { ...prev };
          for (const s of data.statuses!) next[s.prNumber] = s;
          return next;
        });
      }
    } finally {
      setStatusLoading(false);
    }
  }

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchRows();
      if ("error" in result) {
        setError(result.error);
      } else {
        setRows(result);
        await fetchStatuses(result.map((r) => r.prNumber));
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    fetchRows()
      .then((result) => {
        if (cancelled) return;
        if ("error" in result) {
          setError(result.error);
        } else {
          setRows(result);
          fetchStatuses(result.map((r) => r.prNumber));
        }
      })
      .finally(() => {
        if (!cancelled) setInitialLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-semibold text-black dark:text-zinc-50">
          Pull Requests
        </h2>
        <button
          onClick={load}
          disabled={loading}
          className="rounded border border-fuchsia-300 px-3 py-1.5 text-sm text-fuchsia-700 hover:bg-fuchsia-50 disabled:opacity-50 dark:border-fuchsia-800 dark:text-fuchsia-300 dark:hover:bg-fuchsia-950"
        >
          {loading ? "Actualizando..." : "Actualizar"}
        </button>
      </div>

      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Un PR puede tener más de un origen (ej. lo creó &ldquo;Documentación inicial&rdquo; y
        después lo analizó el webhook al pushear un commit) — en ese caso aparece una sola fila
        con todos los badges correspondientes.
      </p>

      {error && (
        <div className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          {error}
        </div>
      )}

      {initialLoading && (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-sm text-zinc-500 dark:text-zinc-400">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-fuchsia-600 border-t-transparent" />
          Cargando...
        </div>
      )}

      {!initialLoading && rows.length === 0 && !error && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Todavía no hay ningún PR analizado ni creado por el sistema.
        </p>
      )}

      {!initialLoading && rows.length > 0 && (
        <div className="overflow-x-auto rounded border border-zinc-300 dark:border-zinc-700">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              <tr>
                <th className="px-3 py-2 font-medium">PR</th>
                <th className="px-3 py-2 font-medium">Estado</th>
                <th className="px-3 py-2 font-medium">Autor</th>
                <th className="px-3 py-2 font-medium">Origen</th>
                <th className="px-3 py-2 font-medium">Título / Resumen</th>
                <th className="px-3 py-2 font-medium">Archivo</th>
                <th className="px-3 py-2 font-medium">Rama</th>
                <th className="px-3 py-2 font-medium">Creado</th>
                <th className="px-3 py-2 font-medium">Última actividad</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.prNumber}
                  className="border-t border-zinc-200 dark:border-zinc-800"
                >
                  <td className="px-3 py-2">
                    <a
                      href={row.prUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-violet-700 hover:underline dark:text-violet-400"
                    >
                      #{row.prNumber}
                    </a>
                  </td>
                  <td className="px-3 py-2">
                    {statuses[row.prNumber] ? (
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE_STYLES[statuses[row.prNumber].state]}`}
                      >
                        {STATUS_LABELS[statuses[row.prNumber].state]}
                      </span>
                    ) : (
                      <span className="text-xs text-zinc-400 dark:text-zinc-500">
                        {statusLoading ? "…" : "?"}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {statuses[row.prNumber]?.author ? (
                      <a
                        href={`https://github.com/${statuses[row.prNumber].author}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-zinc-700 hover:underline dark:text-zinc-300"
                      >
                        {statuses[row.prNumber].authorAvatarUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={statuses[row.prNumber].authorAvatarUrl!}
                            alt=""
                            className="h-5 w-5 rounded-full"
                          />
                        )}
                        {statuses[row.prNumber].author}
                      </a>
                    ) : (
                      <span className="text-xs text-zinc-400 dark:text-zinc-500">
                        {statusLoading ? "…" : "?"}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {SOURCE_ORDER.filter((s) => row.sources.includes(s)).map((s) => (
                        <span
                          key={s}
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${SOURCE_BADGE_STYLES[s]}`}
                        >
                          {SOURCE_LABELS[s]}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="max-w-sm px-3 py-2 text-black dark:text-zinc-100">
                    {row.title}
                  </td>
                  <td
                    className="max-w-xs px-3 py-2 font-mono text-xs break-words text-zinc-600 dark:text-zinc-400"
                    title={statuses[row.prNumber]?.files.join(", ")}
                  >
                    {row.path ?? formatFiles(statuses[row.prNumber]?.files)}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-zinc-600 dark:text-zinc-400">
                    {row.branch ?? statuses[row.prNumber]?.headBranch ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-zinc-500 dark:text-zinc-400">
                    {new Date(row.firstSeenAt).toLocaleString("es-AR")}
                  </td>
                  <td className="px-3 py-2 text-zinc-500 dark:text-zinc-400">
                    {new Date(row.lastActivityAt).toLocaleString("es-AR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
