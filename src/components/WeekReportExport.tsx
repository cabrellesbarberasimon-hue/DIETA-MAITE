"use client";

import { useState } from "react";

/**
 * Informe semanal en texto, listo para copiar y pegar (p.ej. en un chat de
 * IA) o descargar. El texto ya viene generado desde el servidor; este
 * componente solo lo muestra y ofrece copiar/descargar.
 */
export function WeekReportExport({ text, filename }: { text: string; filename: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  function descargar() {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-sm font-semibold text-slate-500"
      >
        <span>📋 Informe de esta semana (para copiar o pasar a una IA)</span>
        <span className="text-slate-400">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="mt-3 space-y-2">
          <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-xs text-slate-700">
            {text}
          </pre>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={copiar}
              className="flex-1 rounded-xl bg-slate-800 py-2 text-sm font-medium text-white"
            >
              {copied ? "✓ Copiado" : "Copiar"}
            </button>
            <button
              type="button"
              onClick={descargar}
              className="flex-1 rounded-xl border border-slate-300 py-2 text-sm font-medium text-slate-600"
            >
              Descargar .txt
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
