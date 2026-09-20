"use client";

import { useState } from "react";
import { createUsuariaAction } from "@/lib/actions/admin";

export function NuevaUsuariaForm() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="space-y-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
      onSubmit={(e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        setError(null);
        setPending(true);
        createUsuariaAction({
          name: form.get("name"),
          email: form.get("email"),
          password: form.get("password"),
          sexo: form.get("sexo"),
          edad: form.get("edad"),
          alturaCm: form.get("alturaCm"),
          pesoInicialKg: form.get("pesoInicialKg"),
          pesoObjetivoKg: form.get("pesoObjetivoKg"),
          bmrKcal: form.get("bmrKcal"),
          factorActividad: form.get("factorActividad"),
          getKcal: form.get("getKcal"),
          deficitDiarioKcal: form.get("deficitDiarioKcal"),
          objetivoProteinaG: form.get("objetivoProteinaG"),
          objetivoGrasasG: form.get("objetivoGrasasG"),
          presupuestoSemanalKcal: form.get("presupuestoSemanalKcal"),
          carbohidratosEntrenamientoG: form.get("carbohidratosEntrenamientoG"),
          carbohidratosDescansoG: form.get("carbohidratosDescansoG"),
        }).catch((err) => {
          setError(err instanceof Error ? err.message : "Error al crear la persona");
          setPending(false);
        });
        // En éxito, la propia acción redirige a la ficha de la nueva persona.
      }}
    >
      <div>
        <h2 className="mb-2 text-sm font-semibold text-slate-500">Cuenta</h2>
        <div className="space-y-2">
          <Field name="name" label="Nombre" />
          <Field name="email" label="Email" type="email" />
          <Field name="password" label="Contraseña" type="password" />
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-slate-500">Datos y objetivos</h2>
        <div className="grid grid-cols-2 gap-2">
          <Field name="sexo" label="Sexo" defaultValue="mujer" />
          <Field name="edad" label="Edad" type="number" />
          <Field name="alturaCm" label="Altura (cm)" type="number" />
          <Field name="factorActividad" label="Factor actividad" type="number" step="0.1" defaultValue="1.4" />
          <Field name="pesoInicialKg" label="Peso inicial (kg)" type="number" step="0.1" />
          <Field name="pesoObjetivoKg" label="Peso objetivo (kg)" type="number" step="0.1" />
          <Field name="bmrKcal" label="BMR (kcal)" type="number" />
          <Field name="getKcal" label="GET (kcal)" type="number" />
          <Field name="deficitDiarioKcal" label="Déficit diario (kcal)" type="number" defaultValue="300" />
          <Field
            name="presupuestoSemanalKcal"
            label="Presupuesto semanal (kcal)"
            type="number"
            className="col-span-2"
          />
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-slate-500">Macros (proteína y grasa fijas siempre)</h2>
        <div className="grid grid-cols-2 gap-2">
          <Field name="objetivoProteinaG" label="Proteína objetivo (g)" type="number" defaultValue="100" />
          <Field name="objetivoGrasasG" label="Grasa objetivo (g)" type="number" defaultValue="47" />
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-slate-500">Carbohidratos según el día</h2>
        <div className="grid grid-cols-2 gap-2">
          <Field name="carbohidratosEntrenamientoG" label="Día de entrenamiento (g)" type="number" defaultValue="150" />
          <Field name="carbohidratosDescansoG" label="Día de descanso (g)" type="number" defaultValue="100" />
        </div>
        <p className="mt-2 text-xs text-slate-400">
          El menú semanal se crea en blanco (se rellena después desde su ficha, pestaña &quot;Plan&quot;). El
          tipo de día (&quot;Descanso&quot; por defecto) lo elige ella cada día desde su panel, según si
          entrena o no.
        </p>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-green-600 py-3 text-base font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Creando…" : "Crear persona"}
      </button>
    </form>
  );
}

function Field({
  name,
  label,
  type = "text",
  step,
  defaultValue,
  className = "",
}: {
  name: string;
  label: string;
  type?: string;
  step?: string;
  defaultValue?: string;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs text-slate-500">{label}</span>
      <input
        name={name}
        type={type}
        step={step}
        defaultValue={defaultValue}
        required
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
    </label>
  );
}
