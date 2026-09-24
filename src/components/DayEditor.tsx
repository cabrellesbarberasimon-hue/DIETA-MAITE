import type { DayData } from "@/lib/data/day";
import { fmtDateLong, fmtKcal, fmtSigned } from "@/lib/format";
import { MEAL_TYPE_LABEL } from "@/lib/nutrition";
import { Semaforo } from "@/components/Semaforo";
import { MacroBar } from "@/components/MacroBar";
import { MealSlot } from "@/components/MealSlot";
import { ExercisePanel } from "@/components/ExercisePanel";
import { DayTypeSelector } from "@/components/DayTypeSelector";
import { WeightForm, type ExistingWeight } from "@/components/WeightForm";

const MEAL_ORDER = ["DESAYUNO", "ALMUERZO", "COMIDA", "COMIDA_LIBRE_SOCIAL", "CENA"] as const;

type ExerciseType = { id: string; nombre: string; met: number };

/**
 * Vista completa (editable) de un día concreto: tipo de día, balance, macros,
 * comidas y ejercicio. La usa tanto el dashboard (hoy) como el historial de
 * la usuaria para cualquier fecha pasada — ya no hay restricción de "solo
 * se puede editar hoy".
 */
export function DayEditor({
  day,
  dateKey,
  exerciseTypes,
  weightExisting,
  lastWeightKg,
  aiPhotoEnabled,
}: {
  day: DayData;
  dateKey: string;
  exerciseTypes: ExerciseType[];
  weightExisting: ExistingWeight | null;
  lastWeightKg: number | null;
  aiPhotoEnabled?: boolean;
}) {
  const { balance, macrosIngeridos, dayPlan, objetivos } = day;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-slate-500 capitalize">{fmtDateLong(day.fecha)}</p>
      </div>

      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <p className="mb-2 text-xs font-semibold text-slate-500">Tipo de día</p>
        <DayTypeSelector dateKey={dateKey} dayTypes={day.dayTypes} selectedId={day.selectedDayTypeId} />
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-500">Balance</h2>
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
          <span className="text-slate-500">🔥 Ejercicio quemado</span>
          <span className="font-semibold text-slate-800">{fmtKcal(balance.kcalEjercicio)}</span>
        </div>
      </section>

      <section className="space-y-3 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-sm font-semibold text-slate-500">Macros</h2>
        <MacroBar
          label="Proteína"
          value={macrosIngeridos.proteinaG}
          target={objetivos.proteinaG}
          color="bg-rose-500"
        />
        <MacroBar
          label="Carbohidratos"
          value={macrosIngeridos.carbohidratosG}
          target={objetivos.carbohidratosG}
          color="bg-amber-500"
        />
        <MacroBar label="Grasas" value={macrosIngeridos.grasasG} target={objetivos.grasasG} color="bg-sky-500" />
      </section>

      <section className="space-y-3">
        <h2 className="px-1 text-sm font-semibold text-slate-500">Comidas</h2>
        {MEAL_ORDER.map((mealType) => {
          const plannedMeals = dayPlan.comidas.filter((c) => c.mealType === mealType);
          const logs = day.mealLogs.filter((l) => l.mealType === mealType);
          return (
            <MealSlot
              key={mealType}
              mealType={mealType}
              label={MEAL_TYPE_LABEL[mealType]}
              plannedMeals={plannedMeals}
              logs={logs}
              dateKey={dateKey}
              aiPhotoEnabled={aiPhotoEnabled}
            />
          );
        })}
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="mb-3 text-sm font-semibold text-slate-500">Ejercicio</h2>
        <ExercisePanel exerciseTypes={exerciseTypes} logs={day.exerciseLogs} dateKey={dateKey} />
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="mb-3 text-sm font-semibold text-slate-500">Peso y medidas de este día</h2>
        <WeightForm dateKey={dateKey} existing={weightExisting} lastWeightKg={lastWeightKg} />
      </section>
    </div>
  );
}
