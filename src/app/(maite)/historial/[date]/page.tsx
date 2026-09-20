import Link from "next/link";
import { requireUsuaria } from "@/lib/auth/guards";
import { getDayData } from "@/lib/data/day";
import { prisma } from "@/lib/prisma";
import { dateKeyToDate } from "@/lib/nutrition";
import { DayEditor } from "@/components/DayEditor";

export default async function HistorialDiaPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const session = await requireUsuaria();
  const { date } = await params;

  const [day, exerciseTypes, weightLog, lastWeightLog] = await Promise.all([
    getDayData(session.sub, date),
    prisma.exerciseType.findMany({ orderBy: { orden: "asc" } }),
    prisma.weightLog.findUnique({
      where: { userId_fecha: { userId: session.sub, fecha: dateKeyToDate(date) } },
    }),
    prisma.weightLog.findFirst({ where: { userId: session.sub }, orderBy: { fecha: "desc" } }),
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
      />
    </div>
  );
}
