"use client";

import { useState } from "react";
import { createUsuariaAction } from "@/lib/actions/admin";
import { PerfilCalculoFields } from "@/components/PerfilCalculoFields";

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
        const pesoObjetivo = form.get("pesoObjetivoKg");
        const grasaObjetivo = form.get("objetivoGrasaCorporalPct");
        createUsuariaAction({
          name: form.get("name"),
          email: form.get("email"),
          password: form.get("password"),
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
        <h2 className="mb-2 text-sm font-semibold text-slate-500">Datos, objetivo y actividad</h2>
        <PerfilCalculoFields
          initial={{
            sexo: "mujer",
            edad: 30,
            alturaCm: 165,
            pesoInicialKg: 65,
          }}
        />
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
