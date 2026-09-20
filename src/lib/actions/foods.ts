"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, requireAdmin } from "@/lib/auth/guards";
import { normalizeSearchText } from "@/lib/text";
import { Prisma } from "@/generated/prisma/client";

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

const createFoodSchema = z.object({
  nombre: z.string().trim().min(1, "Ponle un nombre al alimento"),
  categoria: z.string().trim().min(1).default("Otros"),
  kcal: z.coerce.number().min(0).max(2000),
  proteinaG: z.coerce.number().min(0).max(100),
  carbohidratosG: z.coerce.number().min(0).max(100),
  grasasG: z.coerce.number().min(0).max(100),
});

/**
 * Añade un alimento nuevo a la biblioteca compartida (valores por 100 g).
 * Si ya existe uno con el mismo nombre y categoría, no hace nada (no falla).
 */
export async function createFoodAction(input: unknown): Promise<void> {
  await requireUser();
  const data = createFoodSchema.parse(input);

  try {
    await prisma.food.create({
      data: { ...data, busqueda: normalizeSearchText(data.nombre) },
    });
  } catch (err) {
    const isDuplicate = err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
    if (!isDuplicate) throw err;
  }
}

const updateFoodSchema = z.object({
  id: z.string().min(1),
  nombre: z.string().trim().min(1, "Ponle un nombre al alimento"),
  categoria: z.string().trim().min(1),
  kcal: z.coerce.number().min(0).max(2000),
  proteinaG: z.coerce.number().min(0).max(100),
  carbohidratosG: z.coerce.number().min(0).max(100),
  grasasG: z.coerce.number().min(0).max(100),
});

/** Edita un alimento de la biblioteca (solo admin). */
export async function updateFoodAction(input: unknown): Promise<void> {
  await requireAdmin();
  const { id, ...fields } = updateFoodSchema.parse(input);

  await prisma.food.update({
    where: { id },
    data: { ...fields, busqueda: normalizeSearchText(fields.nombre) },
  });

  revalidatePath("/admin/alimentos");
}

const deleteFoodSchema = z.object({ id: z.string().min(1) });

/** Borra un alimento de la biblioteca (solo admin). */
export async function deleteFoodAction(input: unknown): Promise<void> {
  await requireAdmin();
  const { id } = deleteFoodSchema.parse(input);

  await prisma.food.delete({ where: { id } });

  revalidatePath("/admin/alimentos");
}
