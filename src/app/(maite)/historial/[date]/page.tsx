import Link from "next/link";
import { requireUsuaria } from "@/lib/auth/guards";
import { getDayData } from "@/lib/data/day";
import { getWeekSummary } from "@/lib/data/week";
import { prisma } from "@/lib/prisma";
import { dateKeyToDate, getWeekStart } from "@/lib/nutrition";
import { DayEditor } from "@/components/DayEditor";
import { foodPhotoAnalysisIsConfigured } from "@/lib/ai/food-photo";
import { getExerciseTypesFor } from "@/lib/data/exerciseTypes";
import { getRecentFoodsFor } from "@/lib/data/recentFoods";

export default async function HistorialDiaPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const session = await requireUsuaria();
  const { date } = await params;

  const [day, weekSummary, exerciseTypes, weightLog, lastWeightLog, recentFoods] = await Promise.all([
    getDayData(session.sub, date),
    getWeekSummary(session.sub, getWeekStart(dateKeyToDate(date))),
    getExerciseTypesFor(session.sub),
    prisma.weightLog.findUnique({
      where: { userId_fecha: { userId: session.sub, fecha: dateKeyToDate(date) } },
    }),
    prisma.weightLog.findFirst({ where: { userId: session.sub }, orderBy: { fecha: "desc" } }),
    getRecentFoodsFor(session.sub),
  ]);

  return (
    <div className="mx-auto max-w-md space-y-4">
      <Link href="/historial" className="text-sm font-medium text-slate-500 active:text-slate-700">
        ← Volver al historial
      </Link>
      <DayEditor
        day={day}
        dateKey={date}
        exerciseTypes={exerciseTypes}
        weightExisting={
          weightLog
            ? {
                id: weightLog.id,
                pesoKg: weightLog.pesoKg,
                grasaCorporalPct: weightLog.grasaCorporalPct,
                masaMuscularKg: weightLog.masaMuscularKg,
                pliegues: weightLog.pliegues,
                aguaCorporalPct: weightLog.aguaCorporalPct,
                grasaVisceral: weightLog.grasaVisceral,
                tasaMetabolicaBasalKcal: weightLog.tasaMetabolicaBasalKcal,
                hasImagen: weightLog.imagen !== null,
              }
            : null
        }
        lastWeightKg={lastWeightLog?.pesoKg ?? null}
        aiPhotoEnabled={foodPhotoAnalysisIsConfigured()}
        weekDays={weekSummary.days}
        recentFoods={recentFoods}
      />
    </div>
  );
}
