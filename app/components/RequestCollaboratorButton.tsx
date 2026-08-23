"use client";

import { useState } from "react";

type Status = "idle" | "loading" | "sent" | "error";

export default function RequestCollaboratorButton({
  username,
}: {
  username: string | null;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);

  if (!username) return null;

  async function handleClick() {
    setStatus("loading");
    setMessage(null);
    try {
      const res = await fetch("/api/github/request-collaborator", { method: "POST" });
      const data: { ok: boolean; issueUrl?: string; error?: string } = await res.json();
      if (data.ok) {
        setStatus("sent");
        setMessage("Solicitud enviada — el dueño del repo la va a revisar.");
      } else {
        setStatus("error");
        setMessage(data.error ?? "No se pudo enviar la solicitud");
      }
    } catch {
      setStatus("error");
      setMessage("Error de red");
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleClick}
        disabled={status === "loading" || status === "sent"}
        className="rounded border border-violet-300 px-3 py-1.5 text-sm text-violet-700 hover:bg-violet-50 disabled:opacity-50 dark:border-violet-800 dark:text-violet-300 dark:hover:bg-violet-950"
      >
        {status === "loading"
          ? "Enviando..."
          : status === "sent"
            ? "Solicitud enviada"
            : "Solicitar acceso de colaborador"}
      </button>
      {message && (
        <span
          className={`text-xs ${status === "error" ? "text-red-600 dark:text-red-400" : "text-zinc-500 dark:text-zinc-400"}`}
        >
          {message}
        </span>
      )}
    </div>
  );
}
