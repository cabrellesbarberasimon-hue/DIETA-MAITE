import "server-only";
import { prisma } from "@/lib/prisma";
import { dateKeyToDate, dateToWeekday, sumMacros, computeDailyBalance, computeObjetivoKcal } from "@/lib/nutrition";

export async function getDayData(userId: string, dateKey: string) {
  const fecha = dateKeyToDate(dateKey);
  const weekday = dateToWeekday(fecha);

  const [dayPlan, profile, mealLogs, exerciseLogs] = await Promise.all([
    prisma.dayPlan.findUnique({
      where: { userId_weekday: { userId, weekday } },
      include: {
        dayType: true,
        comidas: { orderBy: { mealType: "asc" } },
      },
    }),
    prisma.profile.findUnique({ where: { userId } }),
    prisma.mealLog.findMany({
      where: { userId, fecha },
      orderBy: { createdAt: "asc" },
    }),
    prisma.exerciseLog.findMany({
      where: { userId, fecha },
      include: { exerciseType: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  if (!dayPlan) throw new Error(`No hay plan configurado para ${weekday}`);
  if (!profile) throw new Error("La usuaria no tiene perfil configurado.");

  const macrosIngeridos = sumMacros(mealLogs);
  const kcalEjercicio = exerciseLogs.reduce((acc, log) => acc + log.kcalQuemadas, 0);

  const objetivos = {
    tipoDia: dayPlan.dayType.nombre,
    proteinaG: profile.objetivoProteinaG,
    carbohidratosG: dayPlan.dayType.carbohidratosG,
    grasasG: profile.objetivoGrasasG,
    kcal: computeObjetivoKcal(profile.objetivoProteinaG, dayPlan.dayType.carbohidratosG, profile.objetivoGrasasG),
  };

  const balance = computeDailyBalance({
    kcalIngeridas: macrosIngeridos.kcal,
    kcalEjercicio,
    getKcalBase: profile.getKcal,
    objetivoKcal: objetivos.kcal,
  });

  return {
    fecha,
    weekday,
    dayPlan,
    objetivos,
    profile,
    mealLogs,
    exerciseLogs,
    macrosIngeridos,
    kcalEjercicio,
    balance,
  };
}

export type DayData = Awaited<ReturnType<typeof getDayData>>;
