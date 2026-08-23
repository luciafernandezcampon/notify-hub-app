"use client";

import { useEffect, useRef, useState } from "react";

const POLL_INTERVAL_MS = 8000;
const TOAST_TTL_MS = 10000;

interface AnalysisSummary {
  id: string;
  prNumber: number;
  source: "manual" | "webhook";
  status: string;
  impact: string | null;
  summary: string | null;
  createdAt: string;
  prUrl: string;
}

type AnalysesResponse =
  | { ok: true; analyses: AnalysisSummary[] }
  | { ok: false; error: string };

const IMPACT_LABELS: Record<string, string> = {
  low: "Bajo",
  medium: "Medio",
  high: "Alto",
};

export default function WebhookNotifications() {
  const [toasts, setToasts] = useState<AnalysisSummary[]>([]);
  const lastSeenRef = useRef<string | null>(null);
  const baselineSetRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      const res = await fetch("/api/analyses?source=webhook&limit=5");
      const data: AnalysesResponse = await res.json();
      if (cancelled || !data.ok) return;

      const items = [...data.analyses].reverse();

      if (!baselineSetRef.current) {
        baselineSetRef.current = true;
        lastSeenRef.current = items.length > 0 ? items[items.length - 1].createdAt : null;
        return;
      }

      const newest = lastSeenRef.current;
      const fresh = newest ? items.filter((item) => item.createdAt > newest) : items;

      if (fresh.length > 0) {
        lastSeenRef.current = fresh[fresh.length - 1].createdAt;
        setToasts((prev) => [...prev, ...fresh]);
        for (const item of fresh) {
          setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== item.id));
          }, TOAST_TTL_MS);
        }
      }
    }

    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed right-4 top-4 z-50 flex w-80 flex-col gap-2">
      {toasts.map((toast) => (
        <a
          key={toast.id}
          href={toast.prUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded border border-fuchsia-300 bg-white p-3 text-sm shadow-lg dark:border-fuchsia-800 dark:bg-zinc-900"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-fuchsia-700 dark:text-fuchsia-300">
              Webhook: PR #{toast.prNumber}
            </span>
            <span className="rounded-full bg-fuchsia-100 px-2 py-0.5 text-xs text-fuchsia-800 dark:bg-fuchsia-950 dark:text-fuchsia-300">
              {toast.impact ? IMPACT_LABELS[toast.impact] ?? toast.impact : "?"}
            </span>
          </div>
          {toast.summary && (
            <p className="mt-1 line-clamp-2 text-zinc-600 dark:text-zinc-400">
              {toast.summary}
            </p>
          )}
        </a>
      ))}
    </div>
  );
}
