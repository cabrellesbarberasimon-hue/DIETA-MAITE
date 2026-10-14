"use client";

import { useState } from "react";
import { addExerciseLogAction, addCustomExerciseLogAction, deleteExerciseLogAction } from "@/lib/actions/logs";

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
  dateKey,
}: {
  exerciseTypes: ExerciseType[];
  logs: ExerciseLog[];
  dateKey?: string;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCustom, setShowCustom] = useState(false);

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
            await addExerciseLogAction({ exerciseTypeId, minutos, fecha: dateKey });
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

      <button
        type="button"
        onClick={() => setShowCustom((v) => !v)}
        className="mt-2 text-xs text-slate-400 underline"
      >
        {showCustom ? "Cancelar" : "¿No está en la lista? Añade uno nuevo a mano"}
      </button>

      {showCustom && (
        <form
          className="mt-2 space-y-2 rounded-lg border border-dashed border-slate-300 p-2"
          onSubmit={(e) => {
            e.preventDefault();
            const formEl = e.currentTarget;
            const formData = new FormData(formEl);
            const nombre = String(formData.get("nombre") ?? "").trim();
            const minutos = Number(formData.get("minutos") ?? 0);
            const kcalQuemadas = Number(formData.get("kcalQuemadas") ?? 0);
            if (!nombre || minutos <= 0 || kcalQuemadas <= 0) return;
            run(async () => {
              await addCustomExerciseLogAction({ nombre, minutos, kcalQuemadas, fecha: dateKey });
              formEl.reset();
              setShowCustom(false);
            });
          }}
        >
          <p className="text-xs text-slate-500">
            Pon el nombre, cuánto has estado y las kcal que has quemado (de tu reloj/app, o lo que calcules). Se
            guarda como un ejercicio nuevo solo tuyo, para elegirlo directamente la próxima vez.
          </p>
          <input
            name="nombre"
            placeholder="Nombre del ejercicio"
            required
            className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              name="minutos"
              type="number"
              inputMode="numeric"
              min={1}
              max={600}
              placeholder="minutos"
              required
              className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm"
            />
            <input
              name="kcalQuemadas"
              type="number"
              inputMode="numeric"
              min={1}
              max={5000}
              placeholder="kcal quemadas"
              required
              className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-slate-800 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            Guardar
          </button>
        </form>
      )}
    </div>
  );
}
