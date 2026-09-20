"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/guards";
import { normalizeSearchText } from "@/lib/text";
import { MealType } from "@/generated/prisma/client";

const mealTypeSchema = z.nativeEnum(MealType);

export type MealTemplateResult = {
  id: string;
  mealType: MealType;
  descripcion: string;
  kcal: number;
  proteinaG: number;
  carbohidratosG: number;
  grasasG: number;
};

const searchSchema = z.object({
  query: z.string().trim().min(1).max(200),
  mealType: mealTypeSchema.optional(),
});

/**
 * Busca en la biblioteca compartida de platos (opciones de comida
 * reutilizables entre personas). Si se pasa mealType, prioriza esa comida
 * pero no excluye el resto (un plato de comida también puede servir de
 * cena). Máx. 20 resultados.
 */
export async function searchMealTemplatesAction(input: unknown): Promise<MealTemplateResult[]> {
  await requireAdmin();
  const { query, mealType } = searchSchema.parse(input);
  const busqueda = normalizeSearchText(query);

  const [delMismoTipo, resto] = await Promise.all([
    mealType
      ? prisma.mealTemplate.findMany({
          where: { mealType, busqueda: { contains: busqueda } },
          orderBy: { descripcion: "asc" },
          take: 20,
        })
      : Promise.resolve([]),
    prisma.mealTemplate.findMany({
      where: mealType
        ? { mealType: { not: mealType }, busqueda: { contains: busqueda } }
        : { busqueda: { contains: busqueda } },
      orderBy: { descripcion: "asc" },
      take: 20,
    }),
  ]);

  return [...delMismoTipo, ...resto].slice(0, 20);
}

const upsertFields = {
  mealType: mealTypeSchema,
  descripcion: z.string().trim().min(1),
  kcal: z.coerce.number().int().min(0).max(10000),
  proteinaG: z.coerce.number().min(0).max(1000),
  carbohidratosG: z.coerce.number().min(0).max(1000),
  grasasG: z.coerce.number().min(0).max(1000),
};

/**
 * Guarda un plato en la biblioteca compartida, para reutilizarlo al
 * planificar el menú de otras personas. Si ya hay uno igual (mismo tipo de
 * comida y descripción), no crea un duplicado. Pensado para llamarse desde
 * otras actions (crear opción manual, importar Excel) además de a mano.
 */
export async function saveMealTemplateAction(input: unknown): Promise<void> {
  await requireAdmin();
  await upsertMealTemplate(z.object(upsertFields).parse(input));
  revalidatePath("/admin/platos");
}

export async function upsertMealTemplate(data: {
  mealType: MealType;
  descripcion: string;
  kcal: number;
  proteinaG: number;
  carbohidratosG: number;
  grasasG: number;
}): Promise<void> {
  const busqueda = normalizeSearchText(data.descripcion);
  const existing = await prisma.mealTemplate.findFirst({
    where: { mealType: data.mealType, busqueda },
  });
  if (existing) return;

  await prisma.mealTemplate.create({
    data: { ...data, busqueda },
  });
}

const updateSchema = z.object({ id: z.string().min(1), ...upsertFields });

export async function updateMealTemplateAction(input: unknown): Promise<void> {
  await requireAdmin();
  const { id, ...fields } = updateSchema.parse(input);

  await prisma.mealTemplate.update({
    where: { id },
    data: { ...fields, busqueda: normalizeSearchText(fields.descripcion) },
  });

  revalidatePath("/admin/platos");
}

const backfillSchema = z.object({ userId: z.string().min(1) });

/**
 * Copia a la biblioteca compartida todos los platos que ya tiene planificados
 * una persona (los que se crearon antes de que existiera esta biblioteca, o
 * sin marcar la casilla de guardarlos). No inventa nada nuevo ni toca su
 * menú: solo copia lo que ya hay. Los que ya estaban en la biblioteca
 * (mismo tipo de comida y descripción) no se duplican.
 */
export async function backfillMealTemplatesFromPlanAction(input: unknown): Promise<{ anadidos: number }> {
  await requireAdmin();
  const { userId } = backfillSchema.parse(input);

  const comidas = await prisma.plannedMeal.findMany({
    where: { dayPlan: { userId }, kcal: { gt: 0 } },
  });

  let anadidos = 0;
  for (const comida of comidas) {
    const busqueda = normalizeSearchText(comida.descripcion);
    const existing = await prisma.mealTemplate.findFirst({
      where: { mealType: comida.mealType, busqueda },
    });
    if (existing) continue;

    await prisma.mealTemplate.create({
      data: {
        mealType: comida.mealType,
        descripcion: comida.descripcion,
        busqueda,
        kcal: comida.kcal,
        proteinaG: comida.proteinaG,
        carbohidratosG: comida.carbohidratosG,
        grasasG: comida.grasasG,
      },
    });
    anadidos += 1;
  }

  revalidatePath("/admin/platos");
  return { anadidos };
}

const deleteSchema = z.object({ id: z.string().min(1) });

export async function deleteMealTemplateAction(input: unknown): Promise<void> {
  await requireAdmin();
  const { id } = deleteSchema.parse(input);

  await prisma.mealTemplate.delete({ where: { id } });

  revalidatePath("/admin/platos");
}
