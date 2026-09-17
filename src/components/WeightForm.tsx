"use client";

import { useState } from "react";
import { addWeightLogAction } from "@/lib/actions/logs";

export function WeightForm({ lastWeightKg }: { lastWeightKg: number | null }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        const pesoKg = Number(form.get("pesoKg"));
        setError(null);
        setDone(false);
        setPending(true);
        addWeightLogAction({ pesoKg })
          .then(() => setDone(true))
          .catch((err) => setError(err instanceof Error ? err.message : "Error"))
          .finally(() => setPending(false));
      }}
    >
      <div className="flex gap-2">
        <input
          name="pesoKg"
          type="number"
          inputMode="decimal"
          step="0.1"
          min={20}
          max={300}
          required
          defaultValue={lastWeightKg ?? undefined}
          placeholder="Peso en kg"
          className="flex-1 rounded-xl border border-slate-300 px-4 py-3 text-base"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          Guardar
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {done && !error && <p className="text-xs text-green-700">Peso guardado ✓</p>}
    </form>
  );
}
