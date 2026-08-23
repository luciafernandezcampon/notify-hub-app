"use client";

import { useState } from "react";
import type { AnalysisResult } from "@/lib/analysis/analyzeChange";

type ApiResponse =
  | { ok: true; result: AnalysisResult }
  | { ok: false; error: string };

export default function Home() {
  const [prNumber, setPrNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<ApiResponse | null>(null);

  async function handleAnalyze() {
    const parsed = Number(prNumber);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      setResponse({ ok: false, error: "Enter a valid PR number" });
      return;
    }

    setLoading(true);
    setResponse(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prNumber: parsed }),
      });
      const data: ApiResponse = await res.json();
      setResponse(data);
    } catch (error) {
      setResponse({
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col flex-1 items-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-2xl flex-col gap-6 py-16 px-6">
        <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
          PR Documentation Analyzer
        </h1>

        <div className="flex gap-3">
          <input
            type="number"
            min={1}
            value={prNumber}
            onChange={(e) => setPrNumber(e.target.value)}
            placeholder="Número de PR"
            className="flex-1 rounded border border-zinc-300 bg-white px-3 py-2 text-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
          />
          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="rounded bg-black px-4 py-2 font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
          >
            {loading ? "Analizando..." : "Analizar ahora"}
          </button>
        </div>

        {response && !response.ok && (
          <div className="rounded border border-red-300 bg-red-50 p-4 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
            {response.error}
          </div>
        )}

        {response && response.ok && (
          <div className="flex flex-col gap-4 rounded border border-zinc-300 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
            <div className="flex flex-wrap gap-2 text-sm">
              <Badge label={`Impacto: ${response.result.impact}`} />
              <Badge
                label={
                  response.result.requiresDocumentationUpdate
                    ? "Requiere actualizar docs"
                    : "No requiere actualizar docs"
                }
              />
              <Badge
                label={
                  response.result.documentationAlreadyUpdated
                    ? "Docs ya actualizados"
                    : "Docs no actualizados"
                }
              />
              <Badge
                label={`Confianza: ${Math.round(
                  response.result.confidence * 100
                )}%`}
              />
            </div>

            <p className="text-black dark:text-zinc-100">
              {response.result.summary}
            </p>

            {response.result.affectedDocs.length > 0 && (
              <div>
                <h2 className="font-medium text-black dark:text-zinc-50">
                  Documentos afectados
                </h2>
                <ul className="list-inside list-disc text-zinc-700 dark:text-zinc-300">
                  {response.result.affectedDocs.map((doc) => (
                    <li key={doc}>{doc}</li>
                  ))}
                </ul>
              </div>
            )}

            {response.result.suggestions.length > 0 && (
              <div>
                <h2 className="font-medium text-black dark:text-zinc-50">
                  Sugerencias
                </h2>
                <ul className="list-inside list-disc text-zinc-700 dark:text-zinc-300">
                  {response.result.suggestions.map((suggestion, i) => (
                    <li key={i}>{suggestion}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function Badge({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-zinc-100 px-3 py-1 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
      {label}
    </span>
  );
}
