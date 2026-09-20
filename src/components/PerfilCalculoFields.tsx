"use client";

import { useMemo, useState } from "react";
import {
  ACTIVITY_LEVELS,
  OBJETIVOS_PRINCIPALES,
  activityFactorFor,
  computeBMR,
  computeDeficitKcal,
  computeGET,
  computeWeeklyBudget,
  type DeficitModo,
} from "@/lib/nutrition";
import { CalculoAutomatico } from "@/components/CalculoAutomatico";

export type PerfilCalculoInitial = {
  sexo: string;
  edad: number;
  alturaCm: number;
  pesoInicialKg: number;
  pesoObjetivoKg?: number | null;
  objetivoGrasaCorporalPct?: number | null;
  objetivoPrincipal?: string | null;
  factorActividadEtiqueta?: string | null;
  factorActividad?: number | null;
  deficitModo?: string | null;
  deficitPorcentaje?: number | null;
  deficitDiarioKcal?: number | null;
  bmrEsManual?: boolean;
  getEsManual?: boolean;
  bmrKcal?: number;
  getKcal?: number;
  presupuestoSemanalKcal?: number;
};

const DEFICIT_PORCENTAJE_PRESETS = [10, 15, 20];

/**
 * Campos de objetivo/actividad/déficit + peso objetivo/%grasa opcionales,
 * con BMR/GET/presupuesto calculados en vivo (Mifflin-St Jeor). Todos los
 * inputs llevan `name` para que el formulario que lo envuelve los lea con
 * FormData tal cual, igual que el resto de la app.
 */
export function PerfilCalculoFields({ initial }: { initial: PerfilCalculoInitial }) {
  const [sexo, setSexo] = useState(initial.sexo);
  const [edad, setEdad] = useState(initial.edad);
  const [alturaCm, setAlturaCm] = useState(initial.alturaCm);
  const [pesoInicialKg, setPesoInicialKg] = useState(initial.pesoInicialKg);
  const [pesoObjetivoKg, setPesoObjetivoKg] = useState(
    initial.pesoObjetivoKg != null ? String(initial.pesoObjetivoKg) : "",
  );
  const [objetivoGrasaPct, setObjetivoGrasaPct] = useState(
    initial.objetivoGrasaCorporalPct != null ? String(initial.objetivoGrasaCorporalPct) : "",
  );
  const [objetivoPrincipal, setObjetivoPrincipal] = useState(
    initial.objetivoPrincipal ?? OBJETIVOS_PRINCIPALES[3].value, // mantenimiento
  );
  const initialEtiqueta = initial.factorActividadEtiqueta ?? "personalizado";
  const [factorEtiqueta, setFactorEtiqueta] = useState(initialEtiqueta);
  const [factorPersonalizado, setFactorPersonalizado] = useState(
    initial.factorActividad != null ? String(initial.factorActividad) : "1.5",
  );
  const [deficitModo, setDeficitModo] = useState<DeficitModo>(
    (initial.deficitModo as DeficitModo) ?? "manual",
  );
  const [deficitPctPreset, setDeficitPctPreset] = useState<string>(
    initial.deficitPorcentaje != null && DEFICIT_PORCENTAJE_PRESETS.includes(initial.deficitPorcentaje)
      ? String(initial.deficitPorcentaje)
      : "personalizado",
  );
  const [deficitPctPersonalizado, setDeficitPctPersonalizado] = useState(
    initial.deficitPorcentaje != null ? String(initial.deficitPorcentaje) : "15",
  );
  const [deficitManualKcal, setDeficitManualKcal] = useState(
    initial.deficitDiarioKcal != null ? String(initial.deficitDiarioKcal) : "300",
  );

  const destacarGrasa = objetivoPrincipal === "reducir_grasa" || objetivoPrincipal === "recomposicion";
  const grasaAlta = Number(objetivoGrasaPct) > 70;

  const factorActividad =
    factorEtiqueta === "personalizado" ? Number(factorPersonalizado) || 0 : activityFactorFor(factorEtiqueta) ?? 0;

  const deficitValor =
    deficitModo === "porcentaje"
      ? Number(deficitPctPreset === "personalizado" ? deficitPctPersonalizado : deficitPctPreset) || 0
      : Number(deficitManualKcal) || 0;

  const preview = useMemo(() => {
    if (!sexo || !pesoInicialKg || !alturaCm || !edad || factorActividad <= 0) return null;
    const bmr = computeBMR(sexo, pesoInicialKg, alturaCm, edad);
    const get = computeGET(bmr, factorActividad);
    const deficit = computeDeficitKcal(get, deficitModo, deficitValor);
    const presupuesto = computeWeeklyBudget(get - deficit);
    return { bmr, get, deficit, presupuesto };
  }, [sexo, pesoInicialKg, alturaCm, edad, factorActividad, deficitModo, deficitValor]);

  const deficitInvalidoPorObjetivo =
    objetivoPrincipal === "reducir_grasa" && preview !== null && preview.deficit <= 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="mb-1 block text-xs text-slate-500">Sexo</span>
          <select
            name="sexo"
            value={sexo}
            onChange={(e) => setSexo(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="mujer">Mujer</option>
            <option value="hombre">Hombre</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-slate-500">Edad</span>
          <input
            name="edad"
            type="number"
            min={1}
            max={120}
            required
            value={edad}
            onChange={(e) => setEdad(Number(e.target.value))}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-slate-500">Altura (cm)</span>
          <input
            name="alturaCm"
            type="number"
            min={50}
            max={250}
            required
            value={alturaCm}
            onChange={(e) => setAlturaCm(Number(e.target.value))}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-slate-500">Peso actual (kg)</span>
          <input
            name="pesoInicialKg"
            type="number"
            step="0.1"
            min={20}
            max={300}
            required
            value={pesoInicialKg}
            onChange={(e) => setPesoInicialKg(Number(e.target.value))}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-xs text-slate-500">Objetivo principal</span>
        <select
          name="objetivoPrincipal"
          value={objetivoPrincipal}
          onChange={(e) => setObjetivoPrincipal(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          {OBJETIVOS_PRINCIPALES.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      <div className={`grid grid-cols-2 gap-2 ${destacarGrasa ? "order-first" : ""}`}>
        <label className="block">
          <span className={`mb-1 block text-xs ${destacarGrasa ? "font-semibold text-green-700" : "text-slate-500"}`}>
            % grasa objetivo {destacarGrasa && "(recomendado)"}
          </span>
          <input
            name="objetivoGrasaCorporalPct"
            type="number"
            step="0.1"
            min={0}
            max={100}
            placeholder="opcional"
            value={objetivoGrasaPct}
            onChange={(e) => setObjetivoGrasaPct(e.target.value)}
            className={`w-full rounded-lg border px-3 py-2 text-sm ${
              destacarGrasa ? "border-green-400 bg-green-50/40" : "border-slate-300"
            }`}
          />
          {grasaAlta && (
            <span className="mt-1 block text-xs text-amber-600">
              Es un % alto — comprueba que sea correcto.
            </span>
          )}
        </label>
        <label className={`block ${destacarGrasa ? "opacity-70" : ""}`}>
          <span className="mb-1 block text-xs text-slate-500">Peso objetivo (kg) {destacarGrasa && "(opcional)"}</span>
          <input
            name="pesoObjetivoKg"
            type="number"
            step="0.1"
            min={20}
            max={300}
            placeholder="opcional"
            value={pesoObjetivoKg}
            onChange={(e) => setPesoObjetivoKg(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
      </div>

      <div>
        <label className="block">
          <span className="mb-1 block text-xs text-slate-500">Nivel de actividad</span>
          <select
            name="factorActividadEtiqueta"
            value={factorEtiqueta}
            onChange={(e) => setFactorEtiqueta(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            {ACTIVITY_LEVELS.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
        </label>
        {factorEtiqueta === "personalizado" && (
          <input
            name="factorActividadPersonalizado"
            type="number"
            step="0.05"
            min={0.5}
            max={3}
            required
            value={factorPersonalizado}
            onChange={(e) => setFactorPersonalizado(e.target.value)}
            placeholder="factor (p.ej. 1.45)"
            className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        )}
        <p className="mt-1 text-xs text-slate-400">Factor utilizado: {factorActividad || "—"}</p>
      </div>

      <div>
        <span className="mb-1 block text-xs text-slate-500">Déficit / superávit</span>
        <div className="mb-2 flex gap-2">
          <button
            type="button"
            onClick={() => setDeficitModo("porcentaje")}
            className={`flex-1 rounded-lg border py-1.5 text-xs font-medium ${
              deficitModo === "porcentaje" ? "border-green-600 bg-green-50 text-green-700" : "border-slate-300 text-slate-500"
            }`}
          >
            Porcentaje
          </button>
          <button
            type="button"
            onClick={() => setDeficitModo("manual")}
            className={`flex-1 rounded-lg border py-1.5 text-xs font-medium ${
              deficitModo === "manual" ? "border-green-600 bg-green-50 text-green-700" : "border-slate-300 text-slate-500"
            }`}
          >
            Kcal manual
          </button>
        </div>
        <input type="hidden" name="deficitModo" value={deficitModo} />

        {deficitModo === "porcentaje" ? (
          <div>
            <select
              value={deficitPctPreset}
              onChange={(e) => setDeficitPctPreset(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              {DEFICIT_PORCENTAJE_PRESETS.map((p) => (
                <option key={p} value={p}>
                  {p}%
                </option>
              ))}
              <option value="personalizado">Personalizado</option>
            </select>
            {deficitPctPreset === "personalizado" && (
              <input
                type="number"
                step="1"
                min={-50}
                max={50}
                value={deficitPctPersonalizado}
                onChange={(e) => setDeficitPctPersonalizado(e.target.value)}
                placeholder="% (negativo = superávit)"
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            )}
            <input type="hidden" name="deficitValor" value={deficitValor} />
          </div>
        ) : (
          <input
            name="deficitValor"
            type="number"
            step="10"
            min={-2000}
            max={2000}
            value={deficitManualKcal}
            onChange={(e) => setDeficitManualKcal(e.target.value)}
            placeholder="p.ej. 200 o 300 kcal (negativo = superávit)"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        )}
        {deficitInvalidoPorObjetivo && (
          <p className="mt-1 text-xs text-red-600">
            Con el objetivo &quot;Reducir grasa corporal&quot; el déficit tiene que ser mayor que 0.
          </p>
        )}
      </div>

      {preview && (
        <CalculoAutomatico
          bmrKcal={preview.bmr}
          factorActividad={factorActividad}
          getKcal={preview.get}
          presupuestoSemanalKcal={preview.presupuesto}
          esManual={initial.bmrEsManual}
        />
      )}
    </div>
  );
}
