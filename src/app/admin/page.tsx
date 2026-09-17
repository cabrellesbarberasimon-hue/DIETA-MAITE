import { getPrimaryUsuaria } from "@/lib/data/usuaria";
import { getDayData } from "@/lib/data/day";
import { getWeekSummary } from "@/lib/data/week";
import { getComplianceStats } from "@/lib/data/stats";
import { prisma } from "@/lib/prisma";
import { todayKey, getWeekStart, today } from "@/lib/nutrition";
import { fmtKcal, fmtNum, fmtSigned } from "@/lib/format";
import { Semaforo } from "@/components/Semaforo";
import { WeightChart } from "@/components/WeightChart";

export default async function AdminResumenPage() {
  const usuaria = await getPrimaryUsuaria();

  const [dayToday, weekSummary, compliance, profile, weightLogs] = await Promise.all([
    getDayData(usuaria.id, todayKey()),
    getWeekSummary(usuaria.id, getWeekStart(today())),
    getComplianceStats(usuaria.id),
    prisma.profile.findUnique({ where: { userId: usuaria.id } }),
    prisma.weightLog.findMany({ where: { userId: usuaria.id }, orderBy: { fecha: "asc" } }),
  ]);

  return (
    <div className="mx-auto max-w-md space-y-5">
      <h1 className="text-lg font-bold text-slate-900">Resumen de {usuaria.name}</h1>

      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-500">Hoy</h2>
          <Semaforo status={dayToday.balance.semaforo} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-slate-500">Ingerido</p>
            <p className="text-xl font-bold text-slate-900">{fmtKcal(dayToday.balance.kcalIngeridas)}</p>
            <p className="text-xs text-slate-400">objetivo {fmtKcal(dayToday.balance.objetivoKcal)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Déficit real</p>
            <p
              className={`text-xl font-bold ${dayToday.balance.deficitReal >= 0 ? "text-green-700" : "text-red-600"}`}
            >
              {fmtSigned(dayToday.balance.deficitReal)} kcal
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="mb-3 text-sm font-semibold text-slate-500">Semana actual</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-slate-500">Media kcal/día</p>
            <p className="text-xl font-bold text-slate-900">{fmtKcal(weekSummary.avgKcal)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Déficit acumulado</p>
            <p
              className={`text-xl font-bold ${weekSummary.deficitAcumulado >= 0 ? "text-green-700" : "text-red-600"}`}
            >
              {fmtSigned(weekSummary.deficitAcumulado)} kcal
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="mb-2 text-sm font-semibold text-slate-500">Cumplimiento (últimos 60 días)</h2>
        <p className="text-2xl font-bold text-slate-900">{compliance.pctEnObjetivo}%</p>
        <p className="text-xs text-slate-400">
          {compliance.diasEnObjetivo} de {compliance.diasConsiderados} días registrados dentro de objetivo
        </p>
      </section>

      {profile && (
        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h2 className="mb-3 text-sm font-semibold text-slate-500">Evolución de peso</h2>
          <WeightChart points={weightLogs} pesoObjetivoKg={profile.pesoObjetivoKg} />
          <p className="mt-2 text-center text-xs text-slate-400">
            Actual: {fmtNum(weightLogs.at(-1)?.pesoKg ?? profile.pesoInicialKg, 1)} kg · Objetivo:{" "}
            {fmtNum(profile.pesoObjetivoKg, 1)} kg
          </p>
        </section>
      )}
    </div>
  );
}
