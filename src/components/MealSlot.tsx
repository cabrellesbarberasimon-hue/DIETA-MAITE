"use client";

import { useState } from "react";
import {
  addPlannedMealLogAction,
  addFreeMealLogAction,
  editMealLogAction,
  deleteMealLogAction,
} from "@/lib/actions/logs";

type PlannedMeal = {
  id: string;
  descripcion: string;
  kcal: number;
  proteinaG: number;
  carbohidratosG: number;
  grasasG: number;
};

type MealLog = {
  id: string;
  nombre: string;
  kcal: number;
  proteinaG: number;
  carbohidratosG: number;
  grasasG: number;
  source: string;
};

export function MealSlot({
  mealType,
  label,
  plannedMeal,
  logs,
}: {
  mealType: string;
  label: string;
  plannedMeal: PlannedMeal | null;
  logs: MealLog[];
}) {
  const [showFreeForm, setShowFreeForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalKcal = logs.reduce((acc, l) => acc + l.kcal, 0);

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

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-semibold text-slate-800">{label}</h3>
        {totalKcal > 0 && <span className="text-sm font-medium text-slate-500">{Math.round(totalKcal)} kcal</span>}
      </div>

      {plannedMeal && plannedMeal.kcal > 0 && (
        <p className="mb-3 text-sm text-slate-500">
          Plan: {plannedMeal.descripcion} · {plannedMeal.kcal} kcal
        </p>
      )}

      {logs.length > 0 && (
        <ul className="mb-3 space-y-2">
          {logs.map((log) =>
            editingId === log.id ? (
              <EditLogForm
                key={log.id}
                log={log}
                onCancel={() => setEditingId(null)}
                onSave={async (values) => {
                  await run(async () => {
                    await editMealLogAction({ id: log.id, ...values });
                    setEditingId(null);
                  });
                }}
                pending={pending}
              />
            ) : (
              <li
                key={log.id}
                className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium text-slate-700">{log.nombre}</p>
                  <p className="text-xs text-slate-400">
                    {log.kcal} kcal · P{Math.round(log.proteinaG)} C{Math.round(log.carbohidratosG)} G
                    {Math.round(log.grasasG)}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    className="rounded-lg px-2 py-1 text-xs font-medium text-slate-500 active:bg-slate-200"
                    onClick={() => setEditingId(log.id)}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    className="rounded-lg px-2 py-1 text-xs font-medium text-red-600 active:bg-red-100"
                    onClick={() => run(() => deleteMealLogAction({ id: log.id }))}
                  >
                    Borrar
                  </button>
                </div>
              </li>
            ),
          )}
        </ul>
      )}

      {error && <p className="mb-2 text-xs text-red-600">{error}</p>}

      <div className="flex flex-wrap gap-2">
        {plannedMeal && plannedMeal.kcal > 0 && (
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              run(() => addPlannedMealLogAction({ plannedMealId: plannedMeal.id, mealType }))
            }
            className="rounded-xl bg-green-600 px-3 py-2 text-sm font-medium text-white active:scale-[0.98] disabled:opacity-60"
          >
            Comido tal cual
          </button>
        )}
        <button
          type="button"
          onClick={() => setShowFreeForm((v) => !v)}
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 active:bg-slate-100"
        >
          {showFreeForm ? "Cancelar" : "Otro alimento"}
        </button>
      </div>

      {showFreeForm && (
        <FreeMealForm
          pending={pending}
          onSubmit={(values) =>
            run(async () => {
              await addFreeMealLogAction({ mealType, ...values });
              setShowFreeForm(false);
            })
          }
        />
      )}
    </div>
  );
}

type MealValues = {
  nombre: string;
  kcal: number;
  proteinaG: number;
  carbohidratosG: number;
  grasasG: number;
};

function FreeMealForm({
  onSubmit,
  pending,
}: {
  onSubmit: (values: MealValues) => void;
  pending: boolean;
}) {
  return (
    <form
      className="mt-3 space-y-2 border-t border-slate-100 pt-3"
      onSubmit={(e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        onSubmit({
          nombre: String(form.get("nombre") ?? ""),
          kcal: Number(form.get("kcal") ?? 0),
          proteinaG: Number(form.get("proteinaG") ?? 0),
          carbohidratosG: Number(form.get("carbohidratosG") ?? 0),
          grasasG: Number(form.get("grasasG") ?? 0),
        });
      }}
    >
      <input
        name="nombre"
        required
        placeholder="¿Qué has comido?"
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
      <div className="grid grid-cols-4 gap-2">
        <NumberField name="kcal" placeholder="kcal" />
        <NumberField name="proteinaG" placeholder="prot. g" />
        <NumberField name="carbohidratosG" placeholder="carb. g" />
        <NumberField name="grasasG" placeholder="gras. g" />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-slate-800 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        Guardar
      </button>
    </form>
  );
}

function EditLogForm({
  log,
  onSave,
  onCancel,
  pending,
}: {
  log: MealLog;
  onSave: (values: MealValues) => void;
  onCancel: () => void;
  pending: boolean;
}) {
  return (
    <li className="rounded-xl bg-slate-50 p-3">
      <form
        className="space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          const form = new FormData(e.currentTarget);
          onSave({
            nombre: String(form.get("nombre") ?? ""),
            kcal: Number(form.get("kcal") ?? 0),
            proteinaG: Number(form.get("proteinaG") ?? 0),
            carbohidratosG: Number(form.get("carbohidratosG") ?? 0),
            grasasG: Number(form.get("grasasG") ?? 0),
          });
        }}
      >
        <input
          name="nombre"
          defaultValue={log.nombre}
          required
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <div className="grid grid-cols-4 gap-2">
          <NumberField name="kcal" defaultValue={log.kcal} placeholder="kcal" />
          <NumberField name="proteinaG" defaultValue={log.proteinaG} placeholder="prot. g" />
          <NumberField name="carbohidratosG" defaultValue={log.carbohidratosG} placeholder="carb. g" />
          <NumberField name="grasasG" defaultValue={log.grasasG} placeholder="gras. g" />
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={pending}
            className="flex-1 rounded-xl bg-green-600 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            Guardar
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl border border-slate-300 py-2 text-sm font-medium text-slate-600"
          >
            Cancelar
          </button>
        </div>
      </form>
    </li>
  );
}

function NumberField({
  name,
  placeholder,
  defaultValue,
}: {
  name: string;
  placeholder: string;
  defaultValue?: number;
}) {
  return (
    <input
      name={name}
      type="number"
      inputMode="decimal"
      step="0.1"
      min={0}
      defaultValue={defaultValue}
      placeholder={placeholder}
      required
      className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm"
    />
  );
}
