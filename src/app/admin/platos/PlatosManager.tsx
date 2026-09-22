"use client";

import { useState } from "react";
import {
  updateMealTemplateAction,
  deleteMealTemplateAction,
  importMealTemplatesExcelAction,
  type ImportMealTemplatesResult,
} from "@/lib/actions/mealTemplates";
import { MEAL_TYPE_LABEL } from "@/lib/nutrition";

const MEAL_TYPES_ORDER = ["DESAYUNO", "ALMUERZO", "COMIDA", "COMIDA_LIBRE_SOCIAL", "CENA"] as const;

type MealTemplate = {
  id: string;
  mealType: string;
  descripcion: string;
  kcal: number;
  proteinaG: number;
  carbohidratosG: number;
  grasasG: number;
};

export function PlatosManager({
  platos,
  query,
  showingLimited,
}: {
  platos: MealTemplate[];
  query: string;
  showingLimited: boolean;
}) {
  return (
    <div className="space-y-3">
      <ExcelImportForm />

      {platos.length === 0 && (
        <p className="rounded-2xl bg-slate-50 p-4 text-center text-sm text-slate-400">
          {query
            ? "No hay platos que coincidan con esa búsqueda."
            : "Todavía no hay platos guardados. Se añaden al crear una opción de comida (o importar un Excel) marcando \"guardar en la biblioteca\"."}
        </p>
      )}

      <ul className="space-y-2">
        {platos.map((plato) => (
          <PlatoRow key={plato.id} plato={plato} />
        ))}
      </ul>

      {showingLimited && (
        <p className="text-center text-xs text-slate-400">
          Mostrando los primeros {platos.length}. Usa el buscador para encontrar otros.
        </p>
      )}
    </div>
  );
}

function ExcelImportForm() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportMealTemplatesResult | null>(null);

  return (
    <details className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <summary className="cursor-pointer list-none">
        <p className="font-semibold text-slate-800">Importar platos desde Excel</p>
        <p className="text-xs text-slate-400">Añade platos nuevos a la biblioteca — nunca borra los que ya había.</p>
      </summary>
      <form
        className="mt-4 space-y-2 border-t border-slate-100 pt-4"
        onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          setError(null);
          setResult(null);
          setPending(true);
          importMealTemplatesExcelAction(formData)
            .then((r) => setResult(r))
            .catch((err) => setError(err instanceof Error ? err.message : "Error"))
            .finally(() => setPending(false));
        }}
      >
        <p className="text-xs text-slate-500">
          Columnas: <strong>comida</strong> (Desayuno/Almuerzo/Comida/Comida libre/Cena),{" "}
          <strong>descripción</strong>, <strong>kcal</strong>, <strong>proteina_g</strong>,{" "}
          <strong>carbohidratos_g</strong>, <strong>grasas_g</strong>. No hace falta columna de día: esto es la
          biblioteca compartida, no el menú de una persona.
        </p>
        <input
          type="file"
          name="file"
          accept=".xlsx"
          required
          className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-slate-800 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {pending ? "Importando…" : "Importar"}
        </button>
        {error && <p className="text-xs text-red-600">{error}</p>}
        {result && (
          <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
            <p>
              {result.creadas} platos añadidos de {result.totalFilas} filas.
            </p>
            {result.errores.length > 0 && (
              <ul className="mt-1 list-disc space-y-0.5 pl-4 text-red-600">
                {result.errores.slice(0, 10).map((e, i) => (
                  <li key={i}>
                    Fila {e.fila}: {e.motivo}
                  </li>
                ))}
                {result.errores.length > 10 && <li>... y {result.errores.length - 10} más</li>}
              </ul>
            )}
          </div>
        )}
      </form>
    </details>
  );
}

function PlatoRow({ plato }: { plato: MealTemplate }) {
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState({
    mealType: plato.mealType,
    descripcion: plato.descripcion,
    kcal: plato.kcal,
    proteinaG: plato.proteinaG,
    carbohidratosG: plato.carbohidratosG,
    grasasG: plato.grasasG,
  });

  if (!editing) {
    return (
      <li className="rounded-xl border border-slate-200 p-3 text-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-slate-700">{plato.descripcion}</p>
            <p className="text-xs text-slate-400">
              {MEAL_TYPE_LABEL[plato.mealType]} · {plato.kcal} kcal · P{plato.proteinaG} C{plato.carbohidratosG} G
              {plato.grasasG}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button type="button" onClick={() => setEditing(true)} className="text-xs font-medium text-green-700">
              Editar
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setError(null);
                setPending(true);
                deleteMealTemplateAction({ id: plato.id }).catch((err) =>
                  setError(err instanceof Error ? err.message : "Error"),
                );
              }}
              className="text-xs font-medium text-red-600"
            >
              Borrar
            </button>
          </div>
        </div>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </li>
    );
  }

  return (
    <li className="space-y-2 rounded-xl border border-green-200 bg-green-50/50 p-3 text-sm">
      <select
        value={fields.mealType}
        onChange={(e) => setFields((f) => ({ ...f, mealType: e.target.value }))}
        className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
      >
        {MEAL_TYPES_ORDER.map((mt) => (
          <option key={mt} value={mt}>
            {MEAL_TYPE_LABEL[mt]}
          </option>
        ))}
      </select>
      <textarea
        value={fields.descripcion}
        onChange={(e) => setFields((f) => ({ ...f, descripcion: e.target.value }))}
        rows={2}
        className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
      />
      <div className="grid grid-cols-4 gap-1">
        <MiniNumber label="kcal" value={fields.kcal} onChange={(v) => setFields((f) => ({ ...f, kcal: v }))} />
        <MiniNumber
          label="prot."
          value={fields.proteinaG}
          onChange={(v) => setFields((f) => ({ ...f, proteinaG: v }))}
        />
        <MiniNumber
          label="carb."
          value={fields.carbohidratosG}
          onChange={(v) => setFields((f) => ({ ...f, carbohidratosG: v }))}
        />
        <MiniNumber
          label="gras."
          value={fields.grasasG}
          onChange={(v) => setFields((f) => ({ ...f, grasasG: v }))}
        />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setError(null);
            setPending(true);
            updateMealTemplateAction({ id: plato.id, ...fields })
              .then(() => setEditing(false))
              .catch((err) => setError(err instanceof Error ? err.message : "Error"))
              .finally(() => setPending(false));
          }}
          className="flex-1 rounded-lg bg-green-600 py-1.5 text-xs font-medium text-white"
        >
          Guardar
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="flex-1 rounded-lg border border-slate-300 py-1.5 text-xs font-medium text-slate-600"
        >
          Cancelar
        </button>
      </div>
    </li>
  );
}

function MiniNumber({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="mb-0.5 block text-[10px] text-slate-400">{label}</span>
      <input
        type="number"
        step="0.1"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-lg border border-slate-300 px-1.5 py-1.5 text-xs"
      />
    </label>
  );
}
