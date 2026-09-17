import "server-only";
import { prisma } from "@/lib/prisma";
import { getDayData } from "@/lib/data/day";
import { addDays, today, toDateKey } from "@/lib/nutrition";

export type ComplianceStats = {
  diasConsiderados: number;
  diasEnObjetivo: number;
  pctEnObjetivo: number;
};

/**
 * % de días "en verde" (dentro de objetivo) entre los últimos `sinceDays` días
 * que ya han pasado y en los que la usuaria registró al menos una comida.
 */
export async function getComplianceStats(userId: string, sinceDays = 60): Promise<ComplianceStats> {
  const desde = addDays(today(), -sinceDays);

  const diasConLogs = await prisma.mealLog.findMany({
    where: { userId, fecha: { gte: desde } },
    select: { fecha: true },
    distinct: ["fecha"],
  });

  let diasEnObjetivo = 0;
  for (const { fecha } of diasConLogs) {
    const day = await getDayData(userId, toDateKey(fecha));
    if (day.balance.semaforo === "VERDE") diasEnObjetivo++;
  }

  const diasConsiderados = diasConLogs.length;
  return {
    diasConsiderados,
    diasEnObjetivo,
    pctEnObjetivo: diasConsiderados > 0 ? Math.round((diasEnObjetivo / diasConsiderados) * 100) : 0,
  };
}
