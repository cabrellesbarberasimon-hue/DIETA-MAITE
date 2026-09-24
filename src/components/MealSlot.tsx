"use client";

import { useState } from "react";
import {
  addPlannedMealLogAction,
  addFreeMealLogAction,
  editMealLogAction,
  deleteMealLogAction,
} from "@/lib/actions/logs";
import { FoodPicker, type FoodPickerValues } from "@/components/FoodPicker";
import { MealTemplatePicker, type MealTemplateValues } from "@/components/MealTemplatePicker";
import { FoodPhotoAnalyzer } from "@/components/FoodPhotoAnalyzer";

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
  plannedMealId: string | null;
};

export function MealSlot({
  mealType,
  label,
  plannedMeals,
  logs,
  dateKey,
  aiPhotoEnabled,
}: {
  mealType: string;
  label: string;
  plannedMeals: PlannedMeal[];
  logs: MealLog[];
  dateKey?: string;
  aiPhotoEnabled?: boolean;
}) {
  const options = plannedMeals.filter((m) => m.kcal > 0);
  const [showFreeForm, setShowFreeForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState(options[0]?.id ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalKcal = logs.reduce((acc, l) => acc + l.kcal, 0);
  const selectedOption = options.find((o) => o.id === selectedOptionId) ?? options[0] ?? null;

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

      {options.length > 0 && (
        <div className="mb-3">
          {options.length > 1 ? (
            <select
              value={selectedOptionId}
              onChange={(e) => setSelectedOptionId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600"
            >
              {options.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.descripcion} · {o.kcal} kcal
                </option>
              ))}
            </select>
          ) : (
            <p className="text-sm text-slate-500">
              Plan: {options[0].descripcion} · {options[0].kcal} kcal
            </p>
          )}
        </div>
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
        {selectedOption && (
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              run(() => addPlannedMealLogAction({ plannedMealId: selectedOption.id, mealType, fecha: dateKey }))
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
          mealType={mealType}
          pending={pending}
          aiPhotoEnabled={aiPhotoEnabled}
          onSubmit={(values) =>
            run(async () => {
              await addFreeMealLogAction({ mealType, ...values, fecha: dateKey });
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
  guardarComoOpcion?: boolean;
  actualizarPlato?: boolean;
};

function FreeMealForm({
  mealType,
  onSubmit,
  pending,
  aiPhotoEnabled,
}: {
  mealType: string;
  onSubmit: (values: MealValues) => void;
  pending: boolean;
  aiPhotoEnabled?: boolean;
}) {
  const [fields, setFields] = useState({ nombre: "", kcal: "", proteinaG: "", carbohidratosG: "", grasasG: "" });
  const [guardarComoOpcion, setGuardarComoOpcion] = useState(false);

  function applyFood(values: FoodPickerValues) {
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
      <MealTemplatePicker mealType={mealType} onApply={applyTemplate} />
      {aiPhotoEnabled && <FoodPhotoAnalyzer onApply={applyFood} />}
      <FoodPicker onApply={applyFood} />
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
        <input
          type="checkbox"
          checked={guardarComoOpcion}
          onChange={(e) => setGuardarComoOpcion(e.target.checked)}
        />
        Guardar como opción de este plan y en la biblioteca de platos (aparecerá para elegir la próxima vez)
      </label>
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
  const [fields, setFields] = useState({
    nombre: log.nombre,
    kcal: String(log.kcal),
    proteinaG: String(log.proteinaG),
    carbohidratosG: String(log.carbohidratosG),
    grasasG: String(log.grasasG),
  });
  const [actualizarPlato, setActualizarPlato] = useState(false);

  function applyFood(values: FoodPickerValues) {
    setFields({
      nombre: values.nombre,
      kcal: String(values.kcal),
      proteinaG: String(values.proteinaG),
      carbohidratosG: String(values.carbohidratosG),
      grasasG: String(values.grasasG),
    });
  }

  return (
    <li className="rounded-xl bg-slate-50 p-3">
      <form
        className="space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          onSave({
            nombre: fields.nombre,
            kcal: Number(fields.kcal) || 0,
            proteinaG: Number(fields.proteinaG) || 0,
            carbohidratosG: Number(fields.carbohidratosG) || 0,
            grasasG: Number(fields.grasasG) || 0,
            actualizarPlato,
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
        {log.plannedMealId && (
          <label className="flex items-center gap-1.5 text-xs text-slate-500">
            <input
              type="checkbox"
              checked={actualizarPlato}
              onChange={(e) => setActualizarPlato(e.target.checked)}
            />
            Actualizar también esta opción del plan (para la próxima vez que se elija)
          </label>
        )}
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
