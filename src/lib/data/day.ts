import "server-only";
import { prisma } from "@/lib/prisma";
import { dateKeyToDate, dateToWeekday, sumMacros, computeDailyBalance, computeObjetivoKcal } from "@/lib/nutrition";

export async function getDayData(userId: string, dateKey: string) {
  const fecha = dateKeyToDate(dateKey);
  const weekday = dateToWeekday(fecha);

  const [dayPlan, dayLog, dayTypes, profile, mealLogs, exerciseLogs] = await Promise.all([
    prisma.dayPlan.findUnique({
      where: { userId_weekday: { userId, weekday } },
      include: {
        comidas: { orderBy: { mealType: "asc" } },
      },
    }),
    prisma.dayLog.findUnique({
      where: { userId_fecha: { userId, fecha } },
      include: { dayType: true },
    }),
    prisma.dayType.findMany({ where: { userId }, orderBy: { updatedAt: "asc" } }),
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

  const activeDayType = dayLog?.dayType ?? dayTypes.find((dt) => dt.predeterminado) ?? dayTypes[0];
  if (!activeDayType) throw new Error("No hay tipos de día configurados para esta usuaria.");

  const macrosIngeridos = sumMacros(mealLogs);
  const kcalEjercicio = exerciseLogs.reduce((acc, log) => acc + log.kcalQuemadas, 0);

  const objetivos = {
    tipoDia: activeDayType.nombre,
    proteinaG: profile.objetivoProteinaG,
    carbohidratosG: activeDayType.carbohidratosG,
    grasasG: profile.objetivoGrasasG,
    kcal: computeObjetivoKcal(profile.objetivoProteinaG, activeDayType.carbohidratosG, profile.objetivoGrasasG),
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
    dayTypes,
    selectedDayTypeId: activeDayType.id,
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
