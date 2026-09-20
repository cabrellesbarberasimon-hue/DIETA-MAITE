"use client";

import { useEffect, useRef, useState } from "react";
import { searchMealTemplatesAction, type MealTemplateResult } from "@/lib/actions/mealTemplates";
import { MEAL_TYPE_LABEL } from "@/lib/nutrition";

export type MealTemplateValues = {
  descripcion: string;
  kcal: number;
  proteinaG: number;
  carbohidratosG: number;
  grasasG: number;
};

/**
 * Buscador sobre la biblioteca compartida de platos (opciones de comida ya
 * usadas con otras personas), con desplegable de sugerencias. Al elegir uno,
 * rellena descripción/kcal/macros — igual que FoodPicker, pero sobre platos
 * completos (no por 100 g).
 */
export function MealTemplatePicker({
  mealType,
  onApply,
}: {
  mealType?: string;
  onApply: (values: MealTemplateValues) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MealTemplateResult[]>([]);
  const [open, setOpen] = useState(false);
  const blurTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!query.trim()) return;
    const handle = setTimeout(() => {
      searchMealTemplatesAction({ query, mealType: mealType || undefined })
        .then((r) => setResults(r))
        .catch(() => setResults([]));
    }, 250);
    return () => clearTimeout(handle);
  }, [query, mealType]);

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
        placeholder="Buscar en la biblioteca de platos (opcional)…"
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
      {open && results.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          {results.map((meal) => (
            <li key={meal.id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  if (blurTimeout.current) clearTimeout(blurTimeout.current);
                  onApply({
                    descripcion: meal.descripcion,
                    kcal: meal.kcal,
                    proteinaG: meal.proteinaG,
                    carbohidratosG: meal.carbohidratosG,
                    grasasG: meal.grasasG,
                  });
                  setQuery("");
                  setResults([]);
                  setOpen(false);
                }}
                className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
              >
                <span className="font-medium text-slate-700">{meal.descripcion}</span>
                <span className="ml-2 text-xs text-slate-400">
                  {MEAL_TYPE_LABEL[meal.mealType]} · {meal.kcal} kcal
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
