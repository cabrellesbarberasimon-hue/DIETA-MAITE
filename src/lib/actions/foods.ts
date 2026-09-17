"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/guards";
import { normalizeSearchText } from "@/lib/text";

const searchSchema = z.object({
  query: z.string().trim().min(1).max(100),
});

export type FoodSearchResult = {
  id: string;
  nombre: string;
  categoria: string;
  kcal: number;
  proteinaG: number;
  carbohidratosG: number;
  grasasG: number;
};

/** Busca alimentos por nombre (por 100 g de porción comestible). Máx. 20 resultados. */
export async function searchFoodsAction(input: unknown): Promise<FoodSearchResult[]> {
  await requireUser();
  const { query } = searchSchema.parse(input);

  return prisma.food.findMany({
    where: { busqueda: { contains: normalizeSearchText(query) } },
    orderBy: { nombre: "asc" },
    take: 20,
  });
}
