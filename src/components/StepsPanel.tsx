"use client";

import { useState } from "react";
import { setStepsLogAction } from "@/lib/actions/logs";

export function StepsPanel({ pasos, dateKey }: { pasos: number; dateKey?: string }) {
  const [value, setValue] = useState(String(pasos || ""));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function guardar() {
    setError(null);
    setSaved(false);
    setPending(true);
    try {
      await setStepsLogAction({ pasos: Number(value) || 0, fecha: dateKey });
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ha ocurrido un error");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        inputMode="numeric"
        min={0}
        max={200000}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setSaved(false);
        }}
        placeholder="Pasos de hoy"
        className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
      <button
        type="button"
        disabled={pending}
        onClick={guardar}
        className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        Guardar
      </button>
      {saved && <span className="text-xs text-green-700">✓</span>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
