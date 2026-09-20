"use client";

import { useState } from "react";
import {
  updatePlannedMealAction,
  updateUsuariaWeightAction,
  updateProfileAction,
  createDayTypeAction,
  updateDayTypeAction,
  deleteDayTypeAction,
  setDefaultDayTypeAction,
} from "@/lib/actions/admin";
import { MEAL_TYPE_LABEL } from "@/lib/nutrition";
import { FoodPicker, type FoodPickerValues } from "@/components/FoodPicker";
import { PerfilCalculoFields } from "@/components/PerfilCalculoFields";

type PlannedMeal = {
  id: string;
  mealType: string;
  descripcion: string;
  kcal: number;
  proteinaG: number;
  carbohidratosG: number;
  grasasG: number;
};

type DayType = {
  id: string;
  nombre: string;
  carbohidratosG: number;
  predeterminado: boolean;
};

type DayPlan = {
  weekday: string;
  weekdayLabel: string;
  comidas: PlannedMeal[];
};

type Profile = {
  sexo: string;
  edad: number;
  alturaCm: number;
  pesoInicialKg: number;
  pesoObjetivoKg: number | null;
  bmrKcal: number;
  bmrEsManual: boolean;
  factorActividad: number;
  factorActividadEtiqueta: string | null;
  getKcal: number;
  getEsManual: boolean;
  deficitDiarioKcal: number;
  deficitModo: string;
  deficitPorcentaje: number | null;
  objetivoPrincipal: string | null;
  objetivoGrasaCorporalPct: number | null;
  objetivoProteinaG: number;
  objetivoGrasasG: number;
  presupuestoSemanalKcal: number;
};

export function CurrentWeightEditor({ userId, pesoActualKg }: { userId: string; pesoActualKg: number }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        setError(null);
        setDone(false);
        setPending(true);
        updateUsuariaWeightAction({ userId, pesoKg: Number(form.get("pesoKg")) })
          .then(() => setDone(true))
          .catch((err) => setError(err instanceof Error ? err.message : "Error"))
          .finally(() => setPending(false));
      }}
    >
      <div className="flex gap-2">
        <input
          name="pesoKg"
          type="number"
          step="0.1"
          min={20}
          max={300}
          defaultValue={pesoActualKg}
          required
          className="flex-1 rounded-xl border border-slate-300 px-4 py-3 text-base"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-slate-800 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          Guardar
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {done && !error && <p className="text-xs text-green-700">Peso actualizado ✓</p>}
    </form>
  );
}

export function ProfileEditor({ userId, profile }: { userId: string; profile: Profile }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [recalcular, setRecalcular] = useState(false);

  return (
    <details className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <summary className="cursor-pointer list-none">
        <p className="font-semibold text-slate-800">Perfil y objetivos generales</p>
        <p className="text-xs text-slate-400">Datos, objetivo, actividad, déficit y macros fijas.</p>
      </summary>
      <form
        className="mt-4 space-y-3 border-t border-slate-100 pt-4"
        onSubmit={(e) => {
          e.preventDefault();
          const form = new FormData(e.currentTarget);
          setError(null);
          setDone(false);
          setPending(true);
          const pesoObjetivo = form.get("pesoObjetivoKg");
          const grasaObjetivo = form.get("objetivoGrasaCorporalPct");
          updateProfileAction({
            userId,
            sexo: form.get("sexo"),
            edad: form.get("edad"),
            alturaCm: form.get("alturaCm"),
            pesoInicialKg: form.get("pesoInicialKg"),
            pesoObjetivoKg: pesoObjetivo ? pesoObjetivo : undefined,
            objetivoGrasaCorporalPct: grasaObjetivo ? grasaObjetivo : undefined,
            objetivoPrincipal: form.get("objetivoPrincipal"),
            factorActividadEtiqueta: form.get("factorActividadEtiqueta"),
            factorActividadPersonalizado: form.get("factorActividadPersonalizado") || undefined,
            deficitModo: form.get("deficitModo"),
            deficitValor: form.get("deficitValor"),
            objetivoProteinaG: form.get("objetivoProteinaG"),
            objetivoGrasasG: form.get("objetivoGrasasG"),
            recalcular,
          })
            .then(() => setDone(true))
            .catch((err) => setError(err instanceof Error ? err.message : "Error"))
            .finally(() => setPending(false));
        }}
      >
        <PerfilCalculoFields
          initial={{
            sexo: profile.sexo,
            edad: profile.edad,
            alturaCm: profile.alturaCm,
            pesoInicialKg: profile.pesoInicialKg,
            pesoObjetivoKg: profile.pesoObjetivoKg,
            objetivoGrasaCorporalPct: profile.objetivoGrasaCorporalPct,
            objetivoPrincipal: profile.objetivoPrincipal,
            factorActividadEtiqueta: profile.factorActividadEtiqueta,
            factorActividad: profile.factorActividad,
            deficitModo: profile.deficitModo,
            deficitPorcentaje: profile.deficitPorcentaje,
            deficitDiarioKcal: profile.deficitDiarioKcal,
            bmrEsManual: profile.bmrEsManual,
            getEsManual: profile.getEsManual,
          }}
        />

        <div className="grid grid-cols-2 gap-2">
          <LabeledNumber
            name="objetivoProteinaG"
            label="Proteína objetivo (g) — fija todos los días"
            defaultValue={profile.objetivoProteinaG}
          />
          <LabeledNumber
            name="objetivoGrasasG"
            label="Grasa objetivo (g) — fija todos los días"
            defaultValue={profile.objetivoGrasasG}
          />
        </div>

        {(profile.bmrEsManual || profile.getEsManual) && (
          <label className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
            <input
              type="checkbox"
              checked={recalcular}
              onChange={(e) => setRecalcular(e.target.checked)}
            />
            Recalcular BMR/GET automáticamente con los datos de arriba (ahora mismo tiene un valor guardado a
            mano)
          </label>
        )}

        {error && <p className="text-xs text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-slate-800 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {done && !error ? "Guardado ✓" : "Guardar perfil"}
        </button>
      </form>
    </details>
  );
}

export function DayTypeManager({ userId, dayTypes }: { userId: string; dayTypes: DayType[] }) {
  const [showNew, setShowNew] = useState(false);

  return (
    <details className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200" open>
      <summary className="cursor-pointer list-none">
        <p className="font-semibold text-slate-800">Tipos de día</p>
        <p className="text-xs text-slate-400">
          Cada tipo define los carbohidratos de ese día (proteína y grasa son siempre las del perfil). La
          usuaria elige el tipo cada día desde su panel; el marcado como predeterminado se usa si todavía no
          ha elegido ninguno ese día.
        </p>
      </summary>

      <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
        {dayTypes.map((dt) => (
          <DayTypeRow key={dt.id} userId={userId} dayType={dt} />
        ))}

        {showNew ? (
          <NewDayTypeForm userId={userId} onDone={() => setShowNew(false)} />
        ) : (
          <button
            type="button"
            onClick={() => setShowNew(true)}
            className="w-full rounded-lg border border-dashed border-slate-300 py-2 text-sm font-medium text-slate-500"
          >
            + Nuevo tipo de día
          </button>
        )}
      </div>
    </details>
  );
}

function DayTypeRow({ userId, dayType }: { userId: string; dayType: DayType }) {
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!editing) {
    return (
      <div className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
        <div className="flex items-center justify-between">
          <div>
            <span className="font-medium text-slate-700">{dayType.nombre}</span>
            <span className="ml-2 text-xs text-slate-400">{dayType.carbohidratosG} g carb.</span>
            {dayType.predeterminado && (
              <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700">
                Predeterminado
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {!dayType.predeterminado && (
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  setError(null);
                  setPending(true);
                  setDefaultDayTypeAction({ userId, id: dayType.id })
                    .catch((err) => setError(err instanceof Error ? err.message : "Error"))
                    .finally(() => setPending(false));
                }}
                className="text-xs font-medium text-slate-500"
              >
                Predeterminar
              </button>
            )}
            <button type="button" onClick={() => setEditing(true)} className="text-xs font-medium text-green-700">
              Editar
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setError(null);
                setPending(true);
                deleteDayTypeAction({ userId, id: dayType.id })
                  .catch((err) => setError(err instanceof Error ? err.message : "Error"))
                  .finally(() => setPending(false));
              }}
              className="text-xs font-medium text-red-600"
            >
              Borrar
            </button>
          </div>
        </div>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <form
      className="space-y-2 rounded-lg border border-green-200 bg-green-50/50 p-3"
      onSubmit={(e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        setError(null);
        setPending(true);
        updateDayTypeAction({
          userId,
          id: dayType.id,
          nombre: form.get("nombre"),
          carbohidratosG: form.get("carbohidratosG"),
        })
          .then(() => setEditing(false))
          .catch((err) => setError(err instanceof Error ? err.message : "Error"))
          .finally(() => setPending(false));
      }}
    >
      <div className="flex gap-2">
        <input
          name="nombre"
          defaultValue={dayType.nombre}
          required
          className="flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
        />
        <input
          name="carbohidratosG"
          type="number"
          min={0}
          defaultValue={dayType.carbohidratosG}
          required
          className="w-24 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
        />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="flex-1 rounded-lg bg-green-600 py-1.5 text-xs font-medium text-white">
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
    </form>
  );
}

function NewDayTypeForm({ userId, onDone }: { userId: string; onDone: () => void }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="space-y-2 rounded-lg border border-slate-300 p-3"
      onSubmit={(e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        setError(null);
        setPending(true);
        createDayTypeAction({
          userId,
          nombre: form.get("nombre"),
          carbohidratosG: form.get("carbohidratosG"),
        })
          .then(() => onDone())
          .catch((err) => setError(err instanceof Error ? err.message : "Error"))
          .finally(() => setPending(false));
      }}
    >
      <div className="flex gap-2">
        <input
          name="nombre"
          placeholder="Nombre (p.ej. Entrenamiento fuerte)"
          required
          className="flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
        />
        <input
          name="carbohidratosG"
          type="number"
          min={0}
          placeholder="carb. g"
          required
          className="w-24 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
        />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="flex-1 rounded-lg bg-green-600 py-1.5 text-xs font-medium text-white">
          Crear
        </button>
        <button
          type="button"
          onClick={onDone}
          className="flex-1 rounded-lg border border-slate-300 py-1.5 text-xs font-medium text-slate-600"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

export function DayPlanCard({ userId, dayPlan }: { userId: string; dayPlan: DayPlan }) {
  return (
    <details className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <summary className="cursor-pointer list-none">
        <p className="font-semibold text-slate-800">{dayPlan.weekdayLabel}</p>
        <p className="text-xs text-slate-400">{dayPlan.comidas.length} comidas planificadas</p>
      </summary>

      <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
        {dayPlan.comidas.map((meal) => (
          <PlannedMealRow key={meal.id} userId={userId} meal={meal} />
        ))}
      </div>
    </details>
  );
}

function PlannedMealRow({ userId, meal }: { userId: string; meal: PlannedMeal }) {
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState({
    descripcion: meal.descripcion,
    kcal: meal.kcal,
    proteinaG: meal.proteinaG,
    carbohidratosG: meal.carbohidratosG,
    grasasG: meal.grasasG,
  });

  if (!editing) {
    return (
      <div className="rounded-xl border border-slate-200 p-3">
        <div className="mb-1 flex items-center justify-between">
          <p className="text-xs font-semibold text-slate-500">{MEAL_TYPE_LABEL[meal.mealType]}</p>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-xs font-medium text-green-700"
          >
            Editar
          </button>
        </div>
        <p className="text-sm text-slate-700">{meal.descripcion}</p>
        <p className="text-xs text-slate-400">
          {meal.kcal} kcal · P{meal.proteinaG} C{meal.carbohidratosG} G{meal.grasasG}
        </p>
      </div>
    );
  }

  function applyFood(values: FoodPickerValues) {
    setFields({
      descripcion: values.nombre,
      kcal: values.kcal,
      proteinaG: values.proteinaG,
      carbohidratosG: values.carbohidratosG,
      grasasG: values.grasasG,
    });
  }

  return (
    <form
      className="space-y-2 rounded-xl border border-green-200 bg-green-50/50 p-3"
      onSubmit={(e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        setError(null);
        setPending(true);
        updatePlannedMealAction({
          userId,
          id: meal.id,
          descripcion: String(form.get("descripcion")),
          kcal: Number(form.get("kcal")),
          proteinaG: Number(form.get("proteinaG")),
          carbohidratosG: Number(form.get("carbohidratosG")),
          grasasG: Number(form.get("grasasG")),
        })
          .then(() => setEditing(false))
          .catch((err) => setError(err instanceof Error ? err.message : "Error"))
          .finally(() => setPending(false));
      }}
    >
      <p className="text-xs font-semibold text-slate-500">{MEAL_TYPE_LABEL[meal.mealType]}</p>

      <FoodPicker onApply={applyFood} />

      <textarea
        name="descripcion"
        value={fields.descripcion}
        onChange={(e) => setFields((f) => ({ ...f, descripcion: e.target.value }))}
        rows={2}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
      <div className="grid grid-cols-4 gap-2">
        <LabeledNumberControlled
          name="kcal"
          label="kcal"
          value={fields.kcal}
          onChange={(v) => setFields((f) => ({ ...f, kcal: v }))}
        />
        <LabeledNumberControlled
          name="proteinaG"
          label="prot."
          value={fields.proteinaG}
          step="0.1"
          onChange={(v) => setFields((f) => ({ ...f, proteinaG: v }))}
        />
        <LabeledNumberControlled
          name="carbohidratosG"
          label="carb."
          value={fields.carbohidratosG}
          step="0.1"
          onChange={(v) => setFields((f) => ({ ...f, carbohidratosG: v }))}
        />
        <LabeledNumberControlled
          name="grasasG"
          label="gras."
          value={fields.grasasG}
          step="0.1"
          onChange={(v) => setFields((f) => ({ ...f, grasasG: v }))}
        />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="flex-1 rounded-lg bg-green-600 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          Guardar
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="flex-1 rounded-lg border border-slate-300 py-2 text-sm font-medium text-slate-600"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

function LabeledNumber({
  name,
  label,
  defaultValue,
  step = "1",
}: {
  name: string;
  label: string;
  defaultValue: number;
  step?: string;
}) {
  return (
    <label className="block">
      <span className="mb-0.5 block text-[10px] text-slate-400">{label}</span>
      <input
        name={name}
        type="number"
        step={step}
        defaultValue={defaultValue}
        required
        className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
      />
    </label>
  );
}

function LabeledNumberControlled({
  name,
  label,
  value,
  onChange,
  step = "1",
}: {
  name: string;
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: string;
}) {
  return (
    <label className="block">
      <span className="mb-0.5 block text-[10px] text-slate-400">{label}</span>
      <input
        name={name}
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        required
        className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
      />
    </label>
  );
}
