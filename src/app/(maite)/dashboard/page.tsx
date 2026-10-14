import { requireUsuaria } from "@/lib/auth/guards";
import { getDayData } from "@/lib/data/day";
import { getWeekSummary } from "@/lib/data/week";
import { prisma } from "@/lib/prisma";
import { todayKey, dateKeyToDate, getWeekStart, today } from "@/lib/nutrition";
import { DayEditor } from "@/components/DayEditor";
import { PushReminderToggle } from "@/components/PushReminderToggle";
import { foodPhotoAnalysisIsConfigured } from "@/lib/ai/food-photo";
import { getExerciseTypesFor } from "@/lib/data/exerciseTypes";
import { getLoggingStreak } from "@/lib/data/stats";

export default async function DashboardPage() {
  const session = await requireUsuaria();
  const dateKey = todayKey();

  const [day, weekSummary, exerciseTypes, weightLog, lastWeightLog, streak] = await Promise.all([
    getDayData(session.sub, dateKey),
    getWeekSummary(session.sub, getWeekStart(today())),
    getExerciseTypesFor(session.sub),
    prisma.weightLog.findUnique({
      where: { userId_fecha: { userId: session.sub, fecha: dateKeyToDate(dateKey) } },
    }),
    prisma.weightLog.findFirst({ where: { userId: session.sub }, orderBy: { fecha: "desc" } }),
    getLoggingStreak(session.sub),
  ]);

  return (
    <div className="mx-auto max-w-md space-y-3">
      {streak > 0 && (
        <div className="flex items-center justify-center gap-1.5 rounded-xl bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700 ring-1 ring-amber-200">
          🔥 {streak} {streak === 1 ? "día seguido registrando" : "días seguidos registrando"}
        </div>
      )}
      <PushReminderToggle vapidPublicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null} />
      <DayEditor
        day={day}
        dateKey={dateKey}
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
      />
    </div>
  );
}
