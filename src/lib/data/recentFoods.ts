import "server-only";
import { prisma } from "@/lib/prisma";

export type RecentFood = {
  nombre: string;
  kcal: number;
  proteinaG: number;
  carbohidratosG: number;
  grasasG: number;
};

/**
 * Alimentos distintos que la usuaria ya ha registrado antes, los más
 * recientes primero, para poder repetirlos con un toque desde "Mis comidas"
 * en el registro rápido.
 */
export async function getRecentFoodsFor(userId: string, limit = 12): Promise<RecentFood[]> {
  return prisma.mealLog.findMany({
    where: { userId },
    distinct: ["nombre"],
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { nombre: true, kcal: true, proteinaG: true, carbohidratosG: true, grasasG: true },
  });
}
