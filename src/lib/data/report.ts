import "server-only";
import { prisma } from "@/lib/prisma";
import { getDayData } from "@/lib/data/day";
import { addDays, average, today as todayDate, toDateKey } from "@/lib/nutrition";

export type RangeSummary = {
  desde: Date;
  hasta: Date;
  diasConDatos: number;
  diasTotales: number;
  avgKcal: number;
  avgProteinaG: number;
  avgCarbohidratosG: number;
  avgGrasasG: number;
  objetivoProteinaG: number;
  objetivoGrasasG: number;
  deficitAcumulado: number;
  pesoInicial: number | null;
  pesoFinal: number | null;
  sesionesEjercicio: number;
  kcalEjercicioTotal: number;
};

/** Resumen agregado de los últimos `dias` días, para el informe PDF. */
export async function getRangeSummary(userId: string, dias: number): Promise<RangeSummary> {
  const hasta = todayDate();
  const desde = addDays(hasta, -(dias - 1));

  const kcalValues: number[] = [];
  const proteinaValues: number[] = [];
  const carbValues: number[] = [];
  const grasaValues: number[] = [];
  let deficitAcumulado = 0;
  let diasConDatos = 0;
  let objetivoProteinaG = 0;
  let objetivoGrasasG = 0;

  for (let i = 0; i < dias; i++) {
    const fecha = addDays(desde, i);
    const dateKey = toDateKey(fecha);
    let day;
    try {
      day = await getDayData(userId, dateKey);
    } catch {
      continue; // sin plan configurado para ese día de la semana
    }
    objetivoProteinaG = day.objetivos.proteinaG;
    objetivoGrasasG = day.objetivos.grasasG;
    if (day.mealLogs.length === 0) continue;

    diasConDatos++;
    kcalValues.push(day.macrosIngeridos.kcal);
    proteinaValues.push(day.macrosIngeridos.proteinaG);
    carbValues.push(day.macrosIngeridos.carbohidratosG);
    grasaValues.push(day.macrosIngeridos.grasasG);
    deficitAcumulado += day.balance.deficitReal;
  }

  const [weightLogs, exerciseLogs] = await Promise.all([
    prisma.weightLog.findMany({
      where: { userId, fecha: { gte: desde, lte: hasta } },
      orderBy: { fecha: "asc" },
    }),
    prisma.exerciseLog.findMany({ where: { userId, fecha: { gte: desde, lte: hasta } } }),
  ]);

  return {
    desde,
    hasta,
    diasConDatos,
    diasTotales: dias,
    avgKcal: average(kcalValues),
    avgProteinaG: average(proteinaValues),
    avgCarbohidratosG: average(carbValues),
    avgGrasasG: average(grasaValues),
    objetivoProteinaG,
    objetivoGrasasG,
    deficitAcumulado,
    pesoInicial: weightLogs[0]?.pesoKg ?? null,
    pesoFinal: weightLogs.at(-1)?.pesoKg ?? null,
    sesionesEjercicio: exerciseLogs.length,
    kcalEjercicioTotal: Math.round(exerciseLogs.reduce((acc, e) => acc + e.kcalQuemadas, 0)),
  };
}
