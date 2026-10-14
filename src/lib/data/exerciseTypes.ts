import "server-only";
import { prisma } from "@/lib/prisma";

/** Tipos de ejercicio visibles para una usuaria: el catálogo general (sin dueño) + los suyos propios. */
export function getExerciseTypesFor(userId: string) {
  return prisma.exerciseType.findMany({
    where: { OR: [{ userId: null }, { userId }] },
    orderBy: { orden: "asc" },
  });
}
