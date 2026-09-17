import { requireUsuaria } from "@/lib/auth/guards";
import { getDayData } from "@/lib/data/day";
import { prisma } from "@/lib/prisma";
import { todayKey } from "@/lib/nutrition";
import { fmtDateLong, fmtKcal, fmtSigned } from "@/lib/format";
import { Semaforo } from "@/components/Semaforo";
import { MacroBar } from "@/components/MacroBar";
import { MealSlot } from "@/components/MealSlot";
import { ExercisePanel } from "@/components/ExercisePanel";
import { MEAL_TYPE_LABEL } from "@/lib/nutrition";

const MEAL_ORDER = ["DESAYUNO", "ALMUERZO", "COMIDA", "COMIDA_LIBRE_SOCIAL", "CENA"] as const;

export default async function DashboardPage() {
  const session = await requireUsuaria();
  const dateKey = todayKey();
  const day = await getDayData(session.sub, dateKey);
  const exerciseTypes = await prisma.exerciseType.findMany({ orderBy: { orden: "asc" } });

  const { balance, macrosIngeridos, dayPlan } = day;

  return (
    <div className="mx-auto max-w-md space-y-5">
      <div>
        <p className="text-sm text-slate-500 capitalize">{fmtDateLong(day.fecha)}</p>
        <p className="text-xs text-slate-400">{dayPlan.tipoDia}</p>
      </div>

      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-500">Balance de hoy</h2>
          <Semaforo status={balance.semaforo} />
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-slate-500">Ingerido</p>
            <p className="text-2xl font-bold text-slate-900">{fmtKcal(balance.kcalIngeridas)}</p>
            <p className="text-xs text-slate-400">objetivo {fmtKcal(balance.objetivoKcal)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Déficit / superávit</p>
            <p
              className={`text-2xl font-bold ${
                balance.deficitReal >= 0 ? "text-green-700" : "text-red-600"
              }`}
            >
              {fmtSigned(balance.deficitReal)} kcal
            </p>
            <p className="text-xs text-slate-400">gasto total {fmtKcal(balance.gastoTotal)}</p>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm">
          <span className="text-slate-500">🔥 Ejercicio quemado hoy</span>
          <span className="font-semibold text-slate-800">{fmtKcal(balance.kcalEjercicio)}</span>
        </div>
      </section>

      <section className="space-y-3 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-sm font-semibold text-slate-500">Macros de hoy</h2>
        <MacroBar
          label="Proteína"
          value={macrosIngeridos.proteinaG}
          target={dayPlan.objetivoProteinaG}
          color="bg-rose-500"
        />
        <MacroBar
          label="Carbohidratos"
          value={macrosIngeridos.carbohidratosG}
          target={dayPlan.objetivoCarbohidratosG}
          color="bg-amber-500"
        />
        <MacroBar
          label="Grasas"
          value={macrosIngeridos.grasasG}
          target={dayPlan.objetivoGrasasG}
          color="bg-sky-500"
        />
      </section>

      <section className="space-y-3">
        <h2 className="px-1 text-sm font-semibold text-slate-500">Comidas</h2>
        {MEAL_ORDER.map((mealType) => {
          const plannedMeal = dayPlan.comidas.find((c) => c.mealType === mealType) ?? null;
          const logs = day.mealLogs.filter((l) => l.mealType === mealType);
          return (
            <MealSlot
              key={mealType}
              mealType={mealType}
              label={MEAL_TYPE_LABEL[mealType]}
              plannedMeal={plannedMeal}
              logs={logs}
            />
          );
        })}
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="mb-3 text-sm font-semibold text-slate-500">Ejercicio</h2>
        <ExercisePanel exerciseTypes={exerciseTypes} logs={day.exerciseLogs} />
      </section>
    </div>
  );
}
