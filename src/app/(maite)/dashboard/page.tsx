import { requireUsuaria } from "@/lib/auth/guards";
import { getDayData } from "@/lib/data/day";
import { prisma } from "@/lib/prisma";
import { todayKey, dateKeyToDate } from "@/lib/nutrition";
import { DayEditor } from "@/components/DayEditor";
import { PushReminderToggle } from "@/components/PushReminderToggle";

export default async function DashboardPage() {
  const session = await requireUsuaria();
  const dateKey = todayKey();

  const [day, exerciseTypes, weightLog, lastWeightLog] = await Promise.all([
    getDayData(session.sub, dateKey),
    prisma.exerciseType.findMany({ orderBy: { orden: "asc" } }),
    prisma.weightLog.findUnique({
      where: { userId_fecha: { userId: session.sub, fecha: dateKeyToDate(dateKey) } },
    }),
    prisma.weightLog.findFirst({ where: { userId: session.sub }, orderBy: { fecha: "desc" } }),
  ]);

  return (
    <div className="mx-auto max-w-md space-y-3">
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
      />
    </div>
  );
}
