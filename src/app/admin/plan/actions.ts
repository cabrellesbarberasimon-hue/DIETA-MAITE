"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/guards";
import { getPrimaryUsuaria } from "@/lib/data/usuaria";
import { today } from "@/lib/nutrition";
import { Weekday } from "@/generated/prisma/client";

const updateDayPlanSchema = z.object({
  weekday: z.nativeEnum(Weekday),
  tipoDia: z.string().trim().min(1),
  objetivoKcal: z.coerce.number().int().min(0).max(10000),
  objetivoProteinaG: z.coerce.number().int().min(0).max(1000),
  objetivoCarbohidratosG: z.coerce.number().int().min(0).max(1000),
  objetivoGrasasG: z.coerce.number().int().min(0).max(1000),
});

export async function updateDayPlanAction(input: unknown) {
  await requireAdmin();
  const data = updateDayPlanSchema.parse(input);

  await prisma.dayPlan.update({
    where: { weekday: data.weekday },
    data: {
      tipoDia: data.tipoDia,
      objetivoKcal: data.objetivoKcal,
      objetivoProteinaG: data.objetivoProteinaG,
      objetivoCarbohidratosG: data.objetivoCarbohidratosG,
      objetivoGrasasG: data.objetivoGrasasG,
    },
  });

  revalidatePath("/admin/plan");
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidatePath("/historial");
}

const updatePlannedMealSchema = z.object({
  id: z.string().min(1),
  descripcion: z.string().trim().min(1),
  kcal: z.coerce.number().int().min(0).max(10000),
  proteinaG: z.coerce.number().min(0).max(1000),
  carbohidratosG: z.coerce.number().min(0).max(1000),
  grasasG: z.coerce.number().min(0).max(1000),
});

export async function updatePlannedMealAction(input: unknown) {
  await requireAdmin();
  const data = updatePlannedMealSchema.parse(input);

  await prisma.plannedMeal.update({
    where: { id: data.id },
    data: {
      descripcion: data.descripcion,
      kcal: data.kcal,
      proteinaG: data.proteinaG,
      carbohidratosG: data.carbohidratosG,
      grasasG: data.grasasG,
    },
  });

  revalidatePath("/admin/plan");
  revalidatePath("/dashboard");
  revalidatePath("/historial");
}

const updateWeightSchema = z.object({
  pesoKg: z.coerce.number().min(20).max(300),
});

export async function updateUsuariaWeightAction(input: unknown) {
  await requireAdmin();
  const data = updateWeightSchema.parse(input);
  const usuaria = await getPrimaryUsuaria();
  const fecha = today();

  await prisma.weightLog.upsert({
    where: { userId_fecha: { userId: usuaria.id, fecha } },
    update: { pesoKg: data.pesoKg },
    create: { userId: usuaria.id, fecha, pesoKg: data.pesoKg },
  });

  revalidatePath("/admin/plan");
  revalidatePath("/admin");
  revalidatePath("/peso");
  revalidatePath("/dashboard");
}
