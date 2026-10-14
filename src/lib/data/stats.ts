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

/**
 * Días seguidos (hasta hoy) en los que la usuaria ha registrado al menos
 * una comida. Si hoy todavía no ha registrado nada, no se da por rota la
 * racha (puede que aún no haya comido) y se cuenta desde ayer hacia atrás.
 */
export async function getLoggingStreak(userId: string, maxLookbackDays = 400): Promise<number> {
  const desde = addDays(today(), -maxLookbackDays);

  const logs = await prisma.mealLog.findMany({
    where: { userId, fecha: { gte: desde } },
    select: { fecha: true },
    distinct: ["fecha"],
  });
  const loggedDates = new Set(logs.map((l) => toDateKey(l.fecha)));

  let cursor = today();
  if (!loggedDates.has(toDateKey(cursor))) {
    cursor = addDays(cursor, -1);
  }

  let streak = 0;
  while (loggedDates.has(toDateKey(cursor))) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}
