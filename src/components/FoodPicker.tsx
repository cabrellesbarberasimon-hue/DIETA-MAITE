"use client";

import { useEffect, useRef, useState } from "react";
import { searchFoodsAction, type FoodSearchResult } from "@/lib/actions/foods";

export type FoodPickerValues = {
  nombre: string;
  kcal: number;
  proteinaG: number;
  carbohidratosG: number;
  grasasG: number;
};

function scale(food: FoodSearchResult, gramos: number): FoodPickerValues {
  const factor = gramos / 100;
  const round1 = (v: number) => Math.round(v * factor * 10) / 10;
  return {
    nombre: `${food.nombre} (${gramos} g)`,
    kcal: Math.round(food.kcal * factor),
    proteinaG: round1(food.proteinaG),
    carbohidratosG: round1(food.carbohidratosG),
    grasasG: round1(food.grasasG),
  };
}

/**
 * Buscador de alimentos (tabla de composición, por 100 g) con desplegable de
 * sugerencias. Al elegir uno y poner los gramos, calcula kcal/macros solo.
 * No sustituye a la entrada manual: es un atajo opcional por encima de ella.
 */
export function FoodPicker({ onApply }: { onApply: (values: FoodPickerValues) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<FoodSearchResult | null>(null);
  const [gramos, setGramos] = useState(100);
  const blurTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (selected || !query.trim()) return;
    const handle = setTimeout(() => {
      searchFoodsAction({ query })
        .then((r) => setResults(r))
        .catch(() => setResults([]));
    }, 250);
    return () => clearTimeout(handle);
  }, [query, selected]);

  if (selected) {
    const preview = scale(selected, gramos);
    return (
      <div className="rounded-lg border border-green-200 bg-green-50/60 p-2 text-sm">
        <div className="mb-1 flex items-center justify-between">
          <span className="font-medium text-slate-700">{selected.nombre}</span>
          <button
            type="button"
            onClick={() => {
              setSelected(null);
              setQuery("");
              setResults([]);
            }}
            className="text-xs text-slate-500 underline"
          >
            cambiar
          </button>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            step="1"
            value={gramos}
            onChange={(e) => setGramos(Math.max(1, Number(e.target.value) || 0))}
            className="w-20 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
          />
          <span className="text-xs text-slate-500">g</span>
          <span className="flex-1 text-xs text-slate-500">
            {preview.kcal} kcal · P{preview.proteinaG} C{preview.carbohidratosG} G{preview.grasasG}
          </span>
          <button
            type="button"
            onClick={() => onApply(preview)}
            className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white"
          >
            Usar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => {
          const value = e.target.value;
          setQuery(value);
          setOpen(true);
          if (!value.trim()) setResults([]);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          blurTimeout.current = setTimeout(() => setOpen(false), 150);
        }}
        placeholder="Buscar alimento (opcional)…"
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
      {open && results.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          {results.map((food) => (
            <li key={food.id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  if (blurTimeout.current) clearTimeout(blurTimeout.current);
                  setSelected(food);
                  setGramos(100);
                  setOpen(false);
                }}
                className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
              >
                <span className="font-medium text-slate-700">{food.nombre}</span>
                <span className="ml-2 text-xs text-slate-400">
                  {food.kcal} kcal/100g · {food.categoria}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
