import Link from "next/link";
import { getPrimaryUsuaria } from "@/lib/data/usuaria";
import { getWeekSummary } from "@/lib/data/week";
import { dateKeyToDate, getWeekStart, todayKey, toDateKey, today as todayDate } from "@/lib/nutrition";
import { fmtDateShort, fmtKcal, fmtNum, fmtSigned } from "@/lib/format";
import { Semaforo } from "@/components/Semaforo";

export default async function AdminHistorialPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const usuaria = await getPrimaryUsuaria();
  const { week } = await searchParams;

  const refDate = week ? dateKeyToDate(week) : dateKeyToDate(todayKey());
  const weekStart = getWeekStart(refDate);
  const summary = await getWeekSummary(usuaria.id, weekStart);

  const prevWeekKey = toDateKey(new Date(weekStart.getTime() - 7 * 86400000));
  const nextWeekKey = toDateKey(new Date(weekStart.getTime() + 7 * 86400000));
  const isCurrentWeek = toDateKey(weekStart) === toDateKey(getWeekStart(todayDate()));

  return (
    <div className="mx-auto max-w-md space-y-5">
      <div className="flex items-center justify-between">
        <Link
          href={`/admin/historial?week=${prevWeekKey}`}
          className="rounded-lg px-3 py-2 text-sm font-medium text-slate-500 active:bg-slate-100"
        >
          ← Anterior
        </Link>
        <h1 className="text-sm font-semibold text-slate-700">
          {fmtDateShort(summary.weekStart)} – {fmtDateShort(summary.weekEnd)}
        </h1>
        {isCurrentWeek ? (
          <span className="px-3 py-2 text-sm text-slate-300">Siguiente →</span>
        ) : (
          <Link
            href={`/admin/historial?week=${nextWeekKey}`}
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-500 active:bg-slate-100"
          >
            Siguiente →
          </Link>
        )}
      </div>

      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="mb-3 text-sm font-semibold text-slate-500">Resumen semanal</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-slate-500">Media kcal/día</p>
            <p className="text-xl font-bold text-slate-900">{fmtKcal(summary.avgKcal)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Déficit acumulado</p>
            <p className={`text-xl font-bold ${summary.deficitAcumulado >= 0 ? "text-green-700" : "text-red-600"}`}>
              {fmtSigned(summary.deficitAcumulado)} kcal
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Macros medios</p>
            <p className="text-sm text-slate-700">
              P{Math.round(summary.avgProteinaG)} · C{Math.round(summary.avgCarbohidratosG)} · G
              {Math.round(summary.avgGrasasG)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Grasa estimada perdida</p>
            <p className="text-sm font-semibold text-slate-700">
              {summary.fatLossKg >= 0 ? fmtNum(summary.fatLossKg, 2) : "0"} kg
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="px-1 text-sm font-semibold text-slate-500">Días</h2>
        {summary.days.map((day) =>
          day.hasData ? (
            <Link
              key={day.dateKey}
              href={`/admin/historial/${day.dateKey}`}
              className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 active:bg-slate-50"
            >
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  {day.weekdayLabel} <span className="font-normal text-slate-400">{fmtDateShort(day.fecha)}</span>
                </p>
                <p className="text-xs text-slate-500">
                  {Math.round(day.kcalIngeridas)} / {Math.round(day.objetivoKcal)} kcal
                </p>
              </div>
              {day.semaforo && <Semaforo status={day.semaforo} />}
            </Link>
          ) : (
            <div
              key={day.dateKey}
              className="flex items-center justify-between rounded-2xl bg-slate-50 p-4 text-slate-300"
            >
              <p className="text-sm font-medium">
                {day.weekdayLabel} <span className="font-normal">{fmtDateShort(day.fecha)}</span>
              </p>
              <span className="text-xs">Aún no llega</span>
            </div>
          ),
        )}
      </section>
    </div>
  );
}
