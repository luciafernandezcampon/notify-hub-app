"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { renderMarkdownToHtml } from "@/lib/markdown/renderMarkdown";

const MAX_MODULES = 5;
const MAX_FILES_PER_MODULE = 5;
const MAX_CHARS_PER_FILE = 3000;

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
  prNumber: number | null;
  prUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

type DraftsResponse = { ok: true; drafts: Draft[] } | { ok: false; error: string };
type DraftResponse = { ok: true; draft: Draft } | { ok: false; error: string };

const STATUS_LABELS: Record<DraftStatus, string> = {
  proposed: "Propuesto",
  accepted: "Aceptado",
  rejected: "Rechazado",
  written: "PR abierto",
};

const STATUS_BADGE_STYLES: Record<DraftStatus, string> = {
  proposed: "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200",
  accepted: "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-950 dark:text-fuchsia-300",
  rejected: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
  written: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300",
};

export default function DocsDrafts() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [generating, setGenerating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

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
      })
      .finally(() => {
        if (!cancelled) setInitialLoading(false);
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

  async function handleAction(
    draft: Draft,
    action: "edit" | "accept" | "reject" | "write",
    content: string
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
          action === "reject" ? { action: "reject" as const } : { action, content };

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
          className="rounded bg-fuchsia-600 px-4 py-2 text-sm font-medium text-white hover:bg-fuchsia-700 disabled:opacity-50"
        >
          {generating ? "Generando..." : "Generar documentación inicial"}
        </button>
      </div>

      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Cada corrida analiza como máximo {MAX_MODULES} módulos sin documentar, hasta{" "}
        {MAX_FILES_PER_MODULE} archivos por módulo, y {MAX_CHARS_PER_FILE.toLocaleString("es-AR")}{" "}
        caracteres por archivo (nunca el repositorio completo). Los módulos que queden afuera de
        ese límite, o el contenido truncado de un archivo largo, no llegan a evaluarse — el
        borrador puede estar incompleto.
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

      {!initialLoading && drafts.length === 0 && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          No hay borradores todavía.
        </p>
      )}

      <div className="flex flex-col gap-4">
        {drafts.map((draft) => (
          <DraftCard
            key={draft.id}
            draft={draft}
            busy={busyId === draft.id}
            onAction={handleAction}
          />
        ))}
      </div>
    </div>
  );
}

function DraftCard({
  draft,
  busy,
  onAction,
}: {
  draft: Draft;
  busy: boolean;
  onAction: (
    draft: Draft,
    action: "edit" | "accept" | "reject" | "write",
    content: string
  ) => void;
}) {
  const initialContent = draft.finalContent ?? draft.proposedContent;
  const [content, setContent] = useState(initialContent);
  const previewHtml = useMemo(() => renderMarkdownToHtml(content), [content]);
  const disabled = busy || draft.status === "written";

  const editorRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const syncingRef = useRef(false);

  function syncScroll(
    source: React.RefObject<HTMLElement | null>,
    target: React.RefObject<HTMLElement | null>
  ) {
    if (syncingRef.current) {
      syncingRef.current = false;
      return;
    }
    const from = source.current;
    const to = target.current;
    if (!from || !to) return;

    const scrollableFrom = from.scrollHeight - from.clientHeight;
    const scrollableTo = to.scrollHeight - to.clientHeight;
    const ratio = scrollableFrom > 0 ? from.scrollTop / scrollableFrom : 0;

    syncingRef.current = true;
    to.scrollTop = ratio * scrollableTo;
  }

  return (
    <div className="flex flex-col gap-3 rounded border border-zinc-300 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium text-black dark:text-zinc-50">
            {draft.title ?? draft.path}
          </p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{draft.path}</p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_BADGE_STYLES[draft.status]}`}
        >
          {STATUS_LABELS[draft.status]}
        </span>
      </div>

      {draft.reason && (
        <p className="text-sm text-zinc-700 dark:text-zinc-300">{draft.reason}</p>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Markdown (editable)
          </span>
          <textarea
            ref={editorRef}
            onScroll={() => syncScroll(editorRef, previewRef)}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="h-[28rem] w-full resize-y rounded border border-zinc-300 bg-zinc-50 p-2 font-mono text-xs text-black dark:border-zinc-700 dark:bg-black dark:text-zinc-100"
            disabled={draft.status === "written"}
          />
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Vista previa HTML
          </span>
          <div
            ref={previewRef}
            onScroll={() => syncScroll(previewRef, editorRef)}
            className="markdown-preview h-[28rem] overflow-y-auto rounded border border-zinc-300 bg-zinc-50 p-2 text-sm text-black dark:border-zinc-700 dark:bg-black dark:text-zinc-100"
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onAction(draft, "edit", content)}
          disabled={disabled}
          className="rounded border border-fuchsia-300 px-3 py-1.5 text-sm text-fuchsia-700 hover:bg-fuchsia-50 disabled:opacity-50 dark:border-fuchsia-800 dark:text-fuchsia-300 dark:hover:bg-fuchsia-950"
        >
          Guardar edición
        </button>
        <button
          onClick={() => {
            if (
              window.confirm(
                "Al aceptar este borrador vas a habilitar la creación de un Pull Request en GitHub con este contenido. ¿Confirmás?"
              )
            ) {
              onAction(draft, "accept", content);
            }
          }}
          disabled={disabled}
          className="rounded bg-fuchsia-600 px-3 py-1.5 text-sm text-white hover:bg-fuchsia-700 disabled:opacity-50"
        >
          Aceptar
        </button>
        <button
          onClick={() => onAction(draft, "reject", content)}
          disabled={disabled}
          className="rounded bg-rose-900 px-3 py-1.5 text-sm text-white hover:bg-rose-950 disabled:opacity-50"
        >
          Rechazar
        </button>
        {draft.status === "accepted" && (
          <button
            onClick={() => onAction(draft, "write", content)}
            disabled={busy}
            className="rounded bg-violet-700 px-3 py-1.5 text-sm text-white hover:bg-violet-800 disabled:opacity-50"
          >
            Crear PR en GitHub
          </button>
        )}
        {draft.status === "written" && draft.prUrl && (
          <a
            href={draft.prUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center rounded bg-violet-700 px-3 py-1.5 text-sm text-white hover:bg-violet-800"
          >
            Ver PR #{draft.prNumber}
          </a>
        )}
      </div>
    </div>
  );
}
