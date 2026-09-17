"use client";

import { useState } from "react";
import {
  updateDayPlanAction,
  updatePlannedMealAction,
  updateUsuariaWeightAction,
  updateProfileAction,
} from "@/lib/actions/admin";
import { MEAL_TYPE_LABEL } from "@/lib/nutrition";

type PlannedMeal = {
  id: string;
  mealType: string;
  descripcion: string;
  kcal: number;
  proteinaG: number;
  carbohidratosG: number;
  grasasG: number;
};

type DayPlan = {
  weekday: string;
  weekdayLabel: string;
  tipoDia: string;
  objetivoKcal: number;
  objetivoProteinaG: number;
  objetivoCarbohidratosG: number;
  objetivoGrasasG: number;
  comidas: PlannedMeal[];
};

type Profile = {
  sexo: string;
  edad: number;
  alturaCm: number;
  pesoInicialKg: number;
  pesoObjetivoKg: number;
  bmrKcal: number;
  factorActividad: number;
  getKcal: number;
  deficitDiarioKcal: number;
  objetivoKcalMediaDia: number;
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

  return (
    <details className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <summary className="cursor-pointer list-none">
        <p className="font-semibold text-slate-800">Perfil y objetivos generales</p>
        <p className="text-xs text-slate-400">Edad, altura, BMR, GET, déficit, presupuesto semanal...</p>
      </summary>
      <form
        className="mt-4 space-y-2 border-t border-slate-100 pt-4"
        onSubmit={(e) => {
          e.preventDefault();
          const form = new FormData(e.currentTarget);
          setError(null);
          setDone(false);
          setPending(true);
          updateProfileAction({
            userId,
            sexo: form.get("sexo"),
            edad: form.get("edad"),
            alturaCm: form.get("alturaCm"),
            pesoInicialKg: form.get("pesoInicialKg"),
            pesoObjetivoKg: form.get("pesoObjetivoKg"),
            bmrKcal: form.get("bmrKcal"),
            factorActividad: form.get("factorActividad"),
            getKcal: form.get("getKcal"),
            deficitDiarioKcal: form.get("deficitDiarioKcal"),
            objetivoKcalMediaDia: form.get("objetivoKcalMediaDia"),
            presupuestoSemanalKcal: form.get("presupuestoSemanalKcal"),
          })
            .then(() => setDone(true))
            .catch((err) => setError(err instanceof Error ? err.message : "Error"))
            .finally(() => setPending(false));
        }}
      >
        <div className="grid grid-cols-2 gap-2">
          <TextField name="sexo" label="Sexo" defaultValue={profile.sexo} />
          <LabeledNumber name="edad" label="Edad" defaultValue={profile.edad} />
          <LabeledNumber name="alturaCm" label="Altura (cm)" defaultValue={profile.alturaCm} />
          <LabeledNumber
            name="factorActividad"
            label="Factor actividad"
            defaultValue={profile.factorActividad}
            step="0.1"
          />
          <LabeledNumber name="pesoInicialKg" label="Peso inicial (kg)" defaultValue={profile.pesoInicialKg} step="0.1" />
          <LabeledNumber name="pesoObjetivoKg" label="Peso objetivo (kg)" defaultValue={profile.pesoObjetivoKg} step="0.1" />
          <LabeledNumber name="bmrKcal" label="BMR (kcal)" defaultValue={profile.bmrKcal} />
          <LabeledNumber name="getKcal" label="GET (kcal)" defaultValue={profile.getKcal} />
          <LabeledNumber name="deficitDiarioKcal" label="Déficit diario (kcal)" defaultValue={profile.deficitDiarioKcal} />
          <LabeledNumber
            name="objetivoKcalMediaDia"
            label="Objetivo kcal media/día"
            defaultValue={profile.objetivoKcalMediaDia}
          />
          <LabeledNumber
            name="presupuestoSemanalKcal"
            label="Presupuesto semanal (kcal)"
            defaultValue={profile.presupuestoSemanalKcal}
          />
        </div>
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

export function DayPlanCard({ userId, dayPlan }: { userId: string; dayPlan: DayPlan }) {
  return (
    <details className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <summary className="cursor-pointer list-none">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-slate-800">{dayPlan.weekdayLabel}</p>
            <p className="text-xs text-slate-400">{dayPlan.tipoDia}</p>
          </div>
          <p className="text-sm font-medium text-slate-500">{dayPlan.objetivoKcal} kcal</p>
        </div>
      </summary>

      <div className="mt-4 space-y-4 border-t border-slate-100 pt-4">
        <DayObjectivesForm userId={userId} dayPlan={dayPlan} />

        <div className="space-y-2">
          {dayPlan.comidas.map((meal) => (
            <PlannedMealRow key={meal.id} userId={userId} meal={meal} />
          ))}
        </div>
      </div>
    </details>
  );
}

function DayObjectivesForm({ userId, dayPlan }: { userId: string; dayPlan: DayPlan }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  return (
    <form
      className="space-y-2 rounded-xl bg-slate-50 p-3"
      onSubmit={(e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        setError(null);
        setDone(false);
        setPending(true);
        updateDayPlanAction({
          userId,
          weekday: dayPlan.weekday,
          tipoDia: String(form.get("tipoDia")),
          objetivoKcal: Number(form.get("objetivoKcal")),
          objetivoProteinaG: Number(form.get("objetivoProteinaG")),
          objetivoCarbohidratosG: Number(form.get("objetivoCarbohidratosG")),
          objetivoGrasasG: Number(form.get("objetivoGrasasG")),
        })
          .then(() => setDone(true))
          .catch((err) => setError(err instanceof Error ? err.message : "Error"))
          .finally(() => setPending(false));
      }}
    >
      <p className="text-xs font-semibold text-slate-500">Objetivos del día</p>
      <input
        name="tipoDia"
        defaultValue={dayPlan.tipoDia}
        placeholder="Tipo de día"
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
      <div className="grid grid-cols-4 gap-2">
        <LabeledNumber name="objetivoKcal" label="kcal" defaultValue={dayPlan.objetivoKcal} />
        <LabeledNumber name="objetivoProteinaG" label="prot." defaultValue={dayPlan.objetivoProteinaG} />
        <LabeledNumber name="objetivoCarbohidratosG" label="carb." defaultValue={dayPlan.objetivoCarbohidratosG} />
        <LabeledNumber name="objetivoGrasasG" label="gras." defaultValue={dayPlan.objetivoGrasasG} />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-slate-800 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {done && !error ? "Guardado ✓" : "Guardar objetivos"}
      </button>
    </form>
  );
}

function PlannedMealRow({ userId, meal }: { userId: string; meal: PlannedMeal }) {
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      <textarea
        name="descripcion"
        defaultValue={meal.descripcion}
        rows={2}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
      <div className="grid grid-cols-4 gap-2">
        <LabeledNumber name="kcal" label="kcal" defaultValue={meal.kcal} />
        <LabeledNumber name="proteinaG" label="prot." defaultValue={meal.proteinaG} step="0.1" />
        <LabeledNumber name="carbohidratosG" label="carb." defaultValue={meal.carbohidratosG} step="0.1" />
        <LabeledNumber name="grasasG" label="gras." defaultValue={meal.grasasG} step="0.1" />
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

function TextField({ name, label, defaultValue }: { name: string; label: string; defaultValue: string }) {
  return (
    <label className="block">
      <span className="mb-0.5 block text-[10px] text-slate-400">{label}</span>
      <input
        name={name}
        type="text"
        defaultValue={defaultValue}
        required
        className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
      />
    </label>
  );
}
