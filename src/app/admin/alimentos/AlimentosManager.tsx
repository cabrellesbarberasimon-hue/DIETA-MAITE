"use client";

import { useState } from "react";
import { updateFoodAction, deleteFoodAction, createFoodAction } from "@/lib/actions/foods";

type Food = {
  id: string;
  nombre: string;
  categoria: string;
  kcal: number;
  proteinaG: number;
  carbohidratosG: number;
  grasasG: number;
};

export function AlimentosManager({
  foods,
  query,
  showingLimited,
}: {
  foods: Food[];
  query: string;
  showingLimited: boolean;
}) {
  const [showNew, setShowNew] = useState(false);

  return (
    <div className="space-y-3">
      {showNew ? (
        <NewFoodForm onDone={() => setShowNew(false)} />
      ) : (
        <button
          type="button"
          onClick={() => setShowNew(true)}
          className="w-full rounded-xl border border-dashed border-slate-300 py-2.5 text-sm font-medium text-slate-500"
        >
          + Nuevo alimento
        </button>
      )}

      {foods.length === 0 && (
        <p className="rounded-2xl bg-slate-50 p-4 text-center text-sm text-slate-400">
          {query ? "No hay alimentos que coincidan con esa búsqueda." : "No hay alimentos todavía."}
        </p>
      )}

      <ul className="space-y-2">
        {foods.map((food) => (
          <FoodRow key={food.id} food={food} />
        ))}
      </ul>

      {showingLimited && (
        <p className="text-center text-xs text-slate-400">
          Mostrando los primeros {foods.length}. Usa el buscador para encontrar otros.
        </p>
      )}
    </div>
  );
}

function FoodRow({ food }: { food: Food }) {
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState({
    nombre: food.nombre,
    categoria: food.categoria,
    kcal: food.kcal,
    proteinaG: food.proteinaG,
    carbohidratosG: food.carbohidratosG,
    grasasG: food.grasasG,
  });

  if (!editing) {
    return (
      <li className="rounded-xl border border-slate-200 p-3 text-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-slate-700">{food.nombre}</p>
            <p className="text-xs text-slate-400">
              {food.categoria} · {food.kcal} kcal · P{food.proteinaG} C{food.carbohidratosG} G{food.grasasG} (100 g)
            </p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setEditing(true)} className="text-xs font-medium text-green-700">
              Editar
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setError(null);
                setPending(true);
                deleteFoodAction({ id: food.id }).catch((err) =>
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
      <input
        value={fields.nombre}
        onChange={(e) => setFields((f) => ({ ...f, nombre: e.target.value }))}
        className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
      />
      <input
        value={fields.categoria}
        onChange={(e) => setFields((f) => ({ ...f, categoria: e.target.value }))}
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
            updateFoodAction({ id: food.id, ...fields })
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

function NewFoodForm({ onDone }: { onDone: () => void }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="space-y-2 rounded-xl border border-slate-300 p-3 text-sm"
      onSubmit={(e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        setError(null);
        setPending(true);
        createFoodAction({
          nombre: form.get("nombre"),
          categoria: form.get("categoria") || "Otros",
          kcal: form.get("kcal"),
          proteinaG: form.get("proteinaG"),
          carbohidratosG: form.get("carbohidratosG"),
          grasasG: form.get("grasasG"),
        })
          .then(() => onDone())
          .catch((err) => setError(err instanceof Error ? err.message : "Error"))
          .finally(() => setPending(false));
      }}
    >
      <input name="nombre" placeholder="Nombre" required className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
      <input
        name="categoria"
        placeholder="Categoría (opcional, por defecto Otros)"
        className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
      />
      <p className="text-[10px] text-slate-400">Valores por 100 g:</p>
      <div className="grid grid-cols-4 gap-1">
        <input name="kcal" type="number" step="1" min={0} placeholder="kcal" required className="w-full rounded-lg border border-slate-300 px-1.5 py-1.5 text-xs" />
        <input name="proteinaG" type="number" step="0.1" min={0} placeholder="prot." required className="w-full rounded-lg border border-slate-300 px-1.5 py-1.5 text-xs" />
        <input name="carbohidratosG" type="number" step="0.1" min={0} placeholder="carb." required className="w-full rounded-lg border border-slate-300 px-1.5 py-1.5 text-xs" />
        <input name="grasasG" type="number" step="0.1" min={0} placeholder="gras." required className="w-full rounded-lg border border-slate-300 px-1.5 py-1.5 text-xs" />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="flex-1 rounded-lg bg-green-600 py-1.5 text-xs font-medium text-white">
          Crear
        </button>
        <button type="button" onClick={onDone} className="flex-1 rounded-lg border border-slate-300 py-1.5 text-xs font-medium text-slate-600">
          Cancelar
        </button>
      </div>
    </form>
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
