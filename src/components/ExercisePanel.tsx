"use client";

import { useState } from "react";
import { addExerciseLogAction, deleteExerciseLogAction } from "@/lib/actions/logs";

type ExerciseType = { id: string; nombre: string; met: number };
type ExerciseLog = {
  id: string;
  minutos: number;
  kcalQuemadas: number;
  exerciseType: { nombre: string };
};

export function ExercisePanel({
  exerciseTypes,
  logs,
}: {
  exerciseTypes: ExerciseType[];
  logs: ExerciseLog[];
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(fn: () => Promise<void>) {
    setError(null);
    setPending(true);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ha ocurrido un error");
    } finally {
      setPending(false);
    }
  }

  const totalKcal = logs.reduce((acc, l) => acc + l.kcalQuemadas, 0);

  return (
    <div>
      {logs.length > 0 && (
        <ul className="mb-3 space-y-2">
          {logs.map((log) => (
            <li
              key={log.id}
              className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm"
            >
              <div>
                <p className="font-medium text-slate-700">{log.exerciseType.nombre}</p>
                <p className="text-xs text-slate-400">
                  {log.minutos} min · {Math.round(log.kcalQuemadas)} kcal
                </p>
              </div>
              <button
                type="button"
                disabled={pending}
                className="rounded-lg px-2 py-1 text-xs font-medium text-red-600 active:bg-red-100"
                onClick={() => run(() => deleteExerciseLogAction({ id: log.id }))}
              >
                Borrar
              </button>
            </li>
          ))}
          <li className="px-3 text-right text-xs font-medium text-slate-500">
            Total: {Math.round(totalKcal)} kcal
          </li>
        </ul>
      )}

      {error && <p className="mb-2 text-xs text-red-600">{error}</p>}

      <form
        className="grid grid-cols-[1fr_auto_auto] gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const formEl = e.currentTarget;
          const formData = new FormData(formEl);
          const exerciseTypeId = String(formData.get("exerciseTypeId") ?? "");
          const minutos = Number(formData.get("minutos") ?? 0);
          if (!exerciseTypeId || minutos <= 0) return;
          run(async () => {
            await addExerciseLogAction({ exerciseTypeId, minutos });
            formEl.reset();
          });
        }}
      >
        <select
          name="exerciseTypeId"
          required
          className="rounded-lg border border-slate-300 px-2 py-2 text-sm"
          defaultValue=""
        >
          <option value="" disabled>
            Tipo
          </option>
          {exerciseTypes.map((et) => (
            <option key={et.id} value={et.id}>
              {et.nombre}
            </option>
          ))}
        </select>
        <input
          name="minutos"
          type="number"
          inputMode="numeric"
          min={1}
          max={600}
          placeholder="min"
          required
          className="w-20 rounded-lg border border-slate-300 px-2 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          +
        </button>
      </form>
    </div>
  );
}
