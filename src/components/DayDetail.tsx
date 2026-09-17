import type { DayData } from "@/lib/data/day";
import { fmtDateLong, fmtKcal, fmtSigned } from "@/lib/format";
import { MEAL_TYPE_LABEL } from "@/lib/nutrition";
import { Semaforo } from "@/components/Semaforo";
import { MacroBar } from "@/components/MacroBar";

const MEAL_ORDER = ["DESAYUNO", "ALMUERZO", "COMIDA", "COMIDA_LIBRE_SOCIAL", "CENA"] as const;

export function DayDetail({ day }: { day: DayData }) {
  const { balance, macrosIngeridos, dayPlan } = day;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-medium text-slate-700 capitalize">{fmtDateLong(day.fecha)}</p>
        <p className="text-xs text-slate-400">{dayPlan.tipoDia}</p>
      </div>

      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-500">Balance</h2>
          <Semaforo status={balance.semaforo} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-slate-500">Ingerido</p>
            <p className="text-2xl font-bold text-slate-900">{fmtKcal(balance.kcalIngeridas)}</p>
            <p className="text-xs text-slate-400">objetivo {fmtKcal(balance.objetivoKcal)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Déficit / superávit</p>
            <p className={`text-2xl font-bold ${balance.deficitReal >= 0 ? "text-green-700" : "text-red-600"}`}>
              {fmtSigned(balance.deficitReal)} kcal
            </p>
            <p className="text-xs text-slate-400">gasto total {fmtKcal(balance.gastoTotal)}</p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm">
          <span className="text-slate-500">🔥 Ejercicio</span>
          <span className="font-semibold text-slate-800">{fmtKcal(balance.kcalEjercicio)}</span>
        </div>
      </section>

      <section className="space-y-3 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-sm font-semibold text-slate-500">Macros</h2>
        <MacroBar label="Proteína" value={macrosIngeridos.proteinaG} target={dayPlan.objetivoProteinaG} color="bg-rose-500" />
        <MacroBar label="Carbohidratos" value={macrosIngeridos.carbohidratosG} target={dayPlan.objetivoCarbohidratosG} color="bg-amber-500" />
        <MacroBar label="Grasas" value={macrosIngeridos.grasasG} target={dayPlan.objetivoGrasasG} color="bg-sky-500" />
      </section>

      <section className="space-y-2">
        <h2 className="px-1 text-sm font-semibold text-slate-500">Comidas</h2>
        {MEAL_ORDER.map((mealType) => {
          const logs = day.mealLogs.filter((l) => l.mealType === mealType);
          if (logs.length === 0) return null;
          return (
            <div key={mealType} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <h3 className="mb-2 font-semibold text-slate-800">{MEAL_TYPE_LABEL[mealType]}</h3>
              <ul className="space-y-1.5">
                {logs.map((log) => (
                  <li key={log.id} className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">{log.nombre}</span>
                    <span className="font-medium text-slate-800">{Math.round(log.kcal)} kcal</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
        {day.mealLogs.length === 0 && (
          <p className="rounded-2xl bg-slate-50 p-4 text-center text-sm text-slate-400">
            No hay comidas registradas este día.
          </p>
        )}
      </section>

      {day.exerciseLogs.length > 0 && (
        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h2 className="mb-2 text-sm font-semibold text-slate-500">Ejercicio</h2>
          <ul className="space-y-1.5">
            {day.exerciseLogs.map((log) => (
              <li key={log.id} className="flex items-center justify-between text-sm">
                <span className="text-slate-600">
                  {log.exerciseType.nombre} · {log.minutos} min
                </span>
                <span className="font-medium text-slate-800">{Math.round(log.kcalQuemadas)} kcal</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
