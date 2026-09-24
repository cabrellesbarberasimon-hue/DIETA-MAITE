import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { toDateKey } from "@/lib/nutrition";

/**
 * Copia de seguridad manual: vuelca todas las tablas a un único JSON, para
 * que el admin la descargue y la guarde donde quiera. No incluye las
 * imágenes de los registros de peso (son binarias y pesarían demasiado en
 * JSON) — sí incluye si un registro tenía una, para saber que falta.
 */
export async function GET() {
  await requireAdmin();

  const [
    users,
    profiles,
    dayTypes,
    dayPlans,
    plannedMeals,
    dayLogs,
    mealLogs,
    exerciseTypes,
    exerciseLogs,
    weightLogs,
    foods,
    mealTemplates,
  ] = await Promise.all([
    prisma.user.findMany(),
    prisma.profile.findMany(),
    prisma.dayType.findMany(),
    prisma.dayPlan.findMany(),
    prisma.plannedMeal.findMany(),
    prisma.dayLog.findMany(),
    prisma.mealLog.findMany(),
    prisma.exerciseType.findMany(),
    prisma.exerciseLog.findMany(),
    prisma.weightLog.findMany({ omit: { imagen: true } }),
    prisma.food.findMany(),
    prisma.mealTemplate.findMany(),
  ]);

  const backup = {
    generadoEn: new Date().toISOString(),
    users,
    profiles,
    dayTypes,
    dayPlans,
    plannedMeals,
    dayLogs,
    mealLogs,
    exerciseTypes,
    exerciseLogs,
    weightLogs: weightLogs.map((w) => ({ ...w, teniaImagen: w.imagenMime !== null })),
    foods,
    mealTemplates,
  };

  const filename = `nutriprogress-backup-${toDateKey(new Date())}.json`;

  return new NextResponse(JSON.stringify(backup, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
