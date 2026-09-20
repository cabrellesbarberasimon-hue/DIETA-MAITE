"use client";

import { useEffect, useRef, useState } from "react";
import { searchFoodsAction, createFoodAction, type FoodSearchResult } from "@/lib/actions/foods";

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
  const [customMode, setCustomMode] = useState(false);
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

  if (customMode) {
    return <CustomFoodEntry onApply={onApply} onCancel={() => setCustomMode(false)} />;
  }

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
      <button
        type="button"
        onClick={() => setCustomMode(true)}
        className="mt-1 text-xs text-slate-400 underline"
      >
        ¿No está en la lista? Añádelo con sus valores por 100 g
      </button>
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

/**
 * Alternativa a la búsqueda: introduces tú los valores por 100 g de un
 * alimento que no está en la tabla, pones cuánto has comido y calcula el
 * consumo. Opcionalmente lo guarda en la biblioteca para futuras búsquedas.
 */
function CustomFoodEntry({
  onApply,
  onCancel,
}: {
  onApply: (values: FoodPickerValues) => void;
  onCancel: () => void;
}) {
  const [nombre, setNombre] = useState("");
  const [categoria, setCategoria] = useState("");
  const [kcal100, setKcal100] = useState("");
  const [proteina100, setProteina100] = useState("");
  const [carb100, setCarb100] = useState("");
  const [grasa100, setGrasa100] = useState("");
  const [gramos, setGramos] = useState(100);
  const [guardar, setGuardar] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const factor = gramos / 100;
  const round1 = (v: number) => Math.round(v * factor * 10) / 10;
  const preview = {
    kcal: Math.round((Number(kcal100) || 0) * factor),
    proteinaG: round1(Number(proteina100) || 0),
    carbohidratosG: round1(Number(carb100) || 0),
    grasasG: round1(Number(grasa100) || 0),
  };

  async function handleUse() {
    if (!nombre.trim()) {
      setError("Ponle un nombre al alimento");
      return;
    }
    setError(null);
    setPending(true);
    try {
      if (guardar) {
        await createFoodAction({
          nombre: nombre.trim(),
          categoria: categoria.trim() || "Otros",
          kcal: Number(kcal100) || 0,
          proteinaG: Number(proteina100) || 0,
          carbohidratosG: Number(carb100) || 0,
          grasasG: Number(grasa100) || 0,
        });
      }
      onApply({ nombre: `${nombre.trim()} (${gramos} g)`, ...preview });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-2 rounded-lg border border-dashed border-slate-300 p-2 text-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500">Alimento nuevo (por 100 g)</span>
        <button type="button" onClick={onCancel} className="text-xs text-slate-400 underline">
          cancelar
        </button>
      </div>
      <input
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        placeholder="Nombre del alimento"
        className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
      />
      <input
        value={categoria}
        onChange={(e) => setCategoria(e.target.value)}
        placeholder="Categoría (opcional)"
        className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
      />
      <div className="grid grid-cols-4 gap-1">
        <MiniField placeholder="kcal/100g" value={kcal100} onChange={setKcal100} />
        <MiniField placeholder="prot./100g" value={proteina100} onChange={setProteina100} />
        <MiniField placeholder="carb./100g" value={carb100} onChange={setCarb100} />
        <MiniField placeholder="gras./100g" value={grasa100} onChange={setGrasa100} />
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
        <span className="text-xs text-slate-500">g comidos</span>
        <span className="flex-1 text-xs text-slate-500">
          {preview.kcal} kcal · P{preview.proteinaG} C{preview.carbohidratosG} G{preview.grasasG}
        </span>
      </div>
      <label className="flex items-center gap-1.5 text-xs text-slate-500">
        <input type="checkbox" checked={guardar} onChange={(e) => setGuardar(e.target.checked)} />
        Guardar este alimento en la biblioteca para futuras búsquedas
      </label>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button
        type="button"
        disabled={pending}
        onClick={handleUse}
        className="w-full rounded-lg bg-green-600 py-1.5 text-xs font-medium text-white disabled:opacity-60"
      >
        Usar
      </button>
    </div>
  );
}

function MiniField({
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
      className="w-full rounded-lg border border-slate-300 px-1.5 py-1.5 text-xs"
    />
  );
}
