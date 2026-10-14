"use client";

import { useState } from "react";
import { FoodPicker, type FoodPickerValues } from "@/components/FoodPicker";
import { MealTemplatePicker, type MealTemplateValues } from "@/components/MealTemplatePicker";
import { FoodPhotoAnalyzer } from "@/components/FoodPhotoAnalyzer";
import { MEAL_TYPE_LABEL } from "@/lib/nutrition";
import type { RecentFood } from "@/lib/data/recentFoods";

export type MealValues = {
  nombre: string;
  kcal: number;
  proteinaG: number;
  carbohidratosG: number;
  grasasG: number;
  guardarComoOpcion?: boolean;
  actualizarPlato?: boolean;
};

export type { RecentFood };

const MEAL_TYPES = ["DESAYUNO", "ALMUERZO", "COMIDA", "COMIDA_LIBRE_SOCIAL", "CENA"] as const;

/**
 * Formulario de "otro alimento": buscador de la biblioteca de alimentos, de
 * platos, foto con IA, y valores a mano. Reutilizado tanto dentro de una
 * comida concreta (MealSlot) como en el registro rápido global (botón "+"),
 * que además deja elegir a qué comida va y ofrece repetir algo ya comido
 * antes (`recentFoods`).
 */
export function FreeMealForm({
  mealType,
  onMealTypeChange,
  onSubmit,
  pending,
  aiPhotoEnabled,
  recentFoods,
  submitLabel = "Guardar",
}: {
  mealType: string;
  onMealTypeChange?: (mealType: string) => void;
  onSubmit: (values: MealValues) => void;
  pending: boolean;
  aiPhotoEnabled?: boolean;
  recentFoods?: RecentFood[];
  submitLabel?: string;
}) {
  const [fields, setFields] = useState({ nombre: "", kcal: "", proteinaG: "", carbohidratosG: "", grasasG: "" });
  const [guardarComoOpcion, setGuardarComoOpcion] = useState(false);

  function applyValues(values: FoodPickerValues | RecentFood) {
    setFields({
      nombre: values.nombre,
      kcal: String(values.kcal),
      proteinaG: String(values.proteinaG),
      carbohidratosG: String(values.carbohidratosG),
      grasasG: String(values.grasasG),
    });
  }

  function applyTemplate(values: MealTemplateValues) {
    setFields({
      nombre: values.descripcion,
      kcal: String(values.kcal),
      proteinaG: String(values.proteinaG),
      carbohidratosG: String(values.carbohidratosG),
      grasasG: String(values.grasasG),
    });
  }

  return (
    <form
      className="mt-3 space-y-2 border-t border-slate-100 pt-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          nombre: fields.nombre,
          kcal: Number(fields.kcal) || 0,
          proteinaG: Number(fields.proteinaG) || 0,
          carbohidratosG: Number(fields.carbohidratosG) || 0,
          grasasG: Number(fields.grasasG) || 0,
          guardarComoOpcion,
        });
      }}
    >
      {onMealTypeChange && (
        <select
          value={mealType}
          onChange={(e) => onMealTypeChange(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700"
        >
          {MEAL_TYPES.map((mt) => (
            <option key={mt} value={mt}>
              {MEAL_TYPE_LABEL[mt]}
            </option>
          ))}
        </select>
      )}

      {recentFoods && recentFoods.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-semibold text-slate-500">Mis comidas</p>
          <div className="flex flex-wrap gap-1.5">
            {recentFoods.map((f, i) => (
              <button
                key={`${f.nombre}-${i}`}
                type="button"
                onClick={() => applyValues(f)}
                className="rounded-full border border-slate-300 px-2.5 py-1 text-xs text-slate-600 active:bg-slate-100"
              >
                {f.nombre} · {Math.round(f.kcal)} kcal
              </button>
            ))}
          </div>
        </div>
      )}

      <MealTemplatePicker mealType={mealType} onApply={applyTemplate} />
      {aiPhotoEnabled && <FoodPhotoAnalyzer onApply={applyValues} />}
      <FoodPicker onApply={applyValues} />
      <input
        value={fields.nombre}
        onChange={(e) => setFields((f) => ({ ...f, nombre: e.target.value }))}
        required
        placeholder="¿Qué has comido?"
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
      <label className="flex items-center gap-1.5 text-xs text-slate-500">
        <input type="checkbox" checked={guardarComoOpcion} onChange={(e) => setGuardarComoOpcion(e.target.checked)} />
        Guardar como opción de este plan y en la biblioteca de platos (aparecerá para elegir la próxima vez)
      </label>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-slate-800 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {submitLabel}
      </button>
    </form>
  );
}

export function NumberFieldControlled({
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
