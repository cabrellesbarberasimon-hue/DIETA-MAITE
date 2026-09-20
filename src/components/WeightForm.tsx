"use client";

import { useState } from "react";
import { addWeightLogAction, deleteWeightLogAction } from "@/lib/actions/logs";

export type ExistingWeight = {
  id: string;
  pesoKg: number;
  grasaCorporalPct: number | null;
  masaMuscularKg: number | null;
  pliegues: number | null;
  aguaCorporalPct: number | null;
  grasaVisceral: number | null;
  tasaMetabolicaBasalKcal: number | null;
  hasImagen: boolean;
};

export function WeightForm({
  dateKey,
  existing,
  lastWeightKg,
}: {
  dateKey?: string;
  existing?: ExistingWeight | null;
  lastWeightKg?: number | null;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        if (dateKey) formData.set("fecha", dateKey);
        setError(null);
        setDone(false);
        setPending(true);
        addWeightLogAction(formData)
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
          defaultValue={existing?.pesoKg ?? lastWeightKg ?? undefined}
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

      <details className="rounded-xl bg-slate-50 p-3">
        <summary className="cursor-pointer list-none text-xs font-semibold text-slate-500">
          Más métricas e imagen (opcional)
        </summary>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <MetricField name="grasaCorporalPct" label="Grasa corporal (%)" defaultValue={existing?.grasaCorporalPct} />
          <MetricField name="masaMuscularKg" label="Masa muscular (kg)" defaultValue={existing?.masaMuscularKg} />
          <MetricField name="pliegues" label="Pliegues (mm)" defaultValue={existing?.pliegues} />
          <MetricField name="aguaCorporalPct" label="Agua corporal (%)" defaultValue={existing?.aguaCorporalPct} />
          <MetricField name="grasaVisceral" label="Grasa visceral" defaultValue={existing?.grasaVisceral} />
          <MetricField
            name="tasaMetabolicaBasalKcal"
            label="Tasa metabólica basal (kcal)"
            defaultValue={existing?.tasaMetabolicaBasalKcal}
            step="1"
          />
        </div>
        <label className="mt-3 block">
          <span className="mb-1 block text-xs text-slate-500">
            Imagen del informe (p.ej. de tu app de báscula)
          </span>
          <input
            name="imagen"
            type="file"
            accept="image/*"
            className="w-full text-xs text-slate-600"
          />
          {existing?.hasImagen && (
            <a
              href={`/api/peso-imagen/${existing.id}`}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-block text-xs text-green-700 underline"
            >
              Ver imagen guardada
            </a>
          )}
        </label>
      </details>

      {error && <p className="text-xs text-red-600">{error}</p>}
      {done && !error && <p className="text-xs text-green-700">Peso guardado ✓</p>}

      {existing && (
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setError(null);
            setPending(true);
            deleteWeightLogAction({ id: existing.id })
              .catch((err) => setError(err instanceof Error ? err.message : "Error"))
              .finally(() => setPending(false));
          }}
          className="text-xs font-medium text-red-600"
        >
          Borrar este registro
        </button>
      )}
    </form>
  );
}

function MetricField({
  name,
  label,
  defaultValue,
  step = "0.1",
}: {
  name: string;
  label: string;
  defaultValue?: number | null;
  step?: string;
}) {
  return (
    <label className="block">
      <span className="mb-0.5 block text-[10px] text-slate-400">{label}</span>
      <input
        name={name}
        type="number"
        step={step}
        min={0}
        defaultValue={defaultValue ?? undefined}
        className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
      />
    </label>
  );
}
