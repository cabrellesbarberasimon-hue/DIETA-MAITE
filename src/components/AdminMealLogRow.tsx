"use client";

import { useState } from "react";
import { editMealLogAction, deleteMealLogAction } from "@/lib/actions/logs";
import { FoodPicker, type FoodPickerValues } from "@/components/FoodPicker";

type MealLog = {
  id: string;
  nombre: string;
  kcal: number;
  proteinaG: number;
  carbohidratosG: number;
  grasasG: number;
};

export function AdminMealLogRow({ log }: { log: MealLog }) {
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState({
    nombre: log.nombre,
    kcal: String(log.kcal),
    proteinaG: String(log.proteinaG),
    carbohidratosG: String(log.carbohidratosG),
    grasasG: String(log.grasasG),
  });

  function applyFood(values: FoodPickerValues) {
    setFields({
      nombre: values.nombre,
      kcal: String(values.kcal),
      proteinaG: String(values.proteinaG),
      carbohidratosG: String(values.carbohidratosG),
      grasasG: String(values.grasasG),
    });
  }

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

  if (!editing) {
    return (
      <li className="space-y-1">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-600">{log.nombre}</span>
          <span className="font-medium text-slate-800">{Math.round(log.kcal)} kcal</span>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-400">
            P{Math.round(log.proteinaG)} C{Math.round(log.carbohidratosG)} G{Math.round(log.grasasG)}
          </p>
          <div className="flex gap-1">
            <button
              type="button"
              className="rounded-lg px-2 py-1 text-xs font-medium text-slate-500 active:bg-slate-200"
              onClick={() => setEditing(true)}
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
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </li>
    );
  }

  return (
    <li className="rounded-xl bg-slate-50 p-3">
      <form
        className="space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          run(async () => {
            await editMealLogAction({
              id: log.id,
              nombre: fields.nombre,
              kcal: Number(fields.kcal) || 0,
              proteinaG: Number(fields.proteinaG) || 0,
              carbohidratosG: Number(fields.carbohidratosG) || 0,
              grasasG: Number(fields.grasasG) || 0,
            });
            setEditing(false);
          });
        }}
      >
        <FoodPicker onApply={applyFood} />
        <input
          value={fields.nombre}
          onChange={(e) => setFields((f) => ({ ...f, nombre: e.target.value }))}
          required
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <div className="grid grid-cols-4 gap-2">
          <NumberFieldControlled
            value={fields.kcal}
            placeholder="kcal"
            onChange={(v) => setFields((f) => ({ ...f, kcal: v }))}
          />
          <NumberFieldControlled
            value={fields.proteinaG}
            placeholder="prot. g"
            onChange={(v) => setFields((f) => ({ ...f, proteinaG: v }))}
          />
          <NumberFieldControlled
            value={fields.carbohidratosG}
            placeholder="carb. g"
            onChange={(v) => setFields((f) => ({ ...f, carbohidratosG: v }))}
          />
          <NumberFieldControlled
            value={fields.grasasG}
            placeholder="gras. g"
            onChange={(v) => setFields((f) => ({ ...f, grasasG: v }))}
          />
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
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
            onClick={() => {
              setEditing(false);
              setError(null);
              setFields({
                nombre: log.nombre,
                kcal: String(log.kcal),
                proteinaG: String(log.proteinaG),
                carbohidratosG: String(log.carbohidratosG),
                grasasG: String(log.grasasG),
              });
            }}
            className="flex-1 rounded-xl border border-slate-300 py-2 text-sm font-medium text-slate-600"
          >
            Cancelar
          </button>
        </div>
      </form>
    </li>
  );
}

function NumberFieldControlled({
  value,
  placeholder,
  onChange,
}: {
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      type="number"
      inputMode="decimal"
      step="0.1"
      min={0}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required
      className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm"
    />
  );
}
