"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUsuaria } from "@/lib/auth/guards";
import { calcExerciseKcal, today, isSameDate } from "@/lib/nutrition";
import { MealType } from "@/generated/prisma/client";

async function getLatestWeightKg(userId: string): Promise<number> {
  const latest = await prisma.weightLog.findFirst({
    where: { userId },
    orderBy: { fecha: "desc" },
  });
  if (latest) return latest.pesoKg;

  const profile = await prisma.profile.findUnique({ where: { userId } });
  if (!profile) throw new Error("La usuaria no tiene un perfil configurado.");
  return profile.pesoInicialKg;
}

const mealTypeSchema = z.nativeEnum(MealType);

// ---------- Comidas ----------

const addPlannedMealSchema = z.object({
  plannedMealId: z.string().min(1),
  mealType: mealTypeSchema,
});

export async function addPlannedMealLogAction(input: unknown) {
  const session = await requireUsuaria();
  const data = addPlannedMealSchema.parse(input);

  const plannedMeal = await prisma.plannedMeal.findUnique({
    where: { id: data.plannedMealId },
    include: { dayPlan: true },
  });
  if (
    !plannedMeal ||
    plannedMeal.mealType !== data.mealType ||
    plannedMeal.dayPlan.userId !== session.sub
  ) {
    throw new Error("El plato planificado no existe para esa comida.");
  }

  await prisma.mealLog.create({
    data: {
      userId: session.sub,
      fecha: today(),
      mealType: data.mealType,
      source: "PLANIFICADO",
      plannedMealId: plannedMeal.id,
      nombre: plannedMeal.descripcion,
      kcal: plannedMeal.kcal,
      proteinaG: plannedMeal.proteinaG,
      carbohidratosG: plannedMeal.carbohidratosG,
      grasasG: plannedMeal.grasasG,
    },
  });

  revalidatePath("/dashboard");
}

const freeMealSchema = z.object({
  mealType: mealTypeSchema,
  nombre: z.string().trim().min(1, "Ponle un nombre al plato"),
  kcal: z.coerce.number().min(0).max(10000),
  proteinaG: z.coerce.number().min(0).max(1000),
  carbohidratosG: z.coerce.number().min(0).max(1000),
  grasasG: z.coerce.number().min(0).max(1000),
});

export async function addFreeMealLogAction(input: unknown) {
  const session = await requireUsuaria();
  const data = freeMealSchema.parse(input);

  await prisma.mealLog.create({
    data: {
      userId: session.sub,
      fecha: today(),
      mealType: data.mealType,
      source: "LIBRE",
      nombre: data.nombre,
      kcal: data.kcal,
      proteinaG: data.proteinaG,
      carbohidratosG: data.carbohidratosG,
      grasasG: data.grasasG,
    },
  });

  revalidatePath("/dashboard");
}

const editMealSchema = z.object({
  id: z.string().min(1),
  nombre: z.string().trim().min(1, "Ponle un nombre al plato"),
  kcal: z.coerce.number().min(0).max(10000),
  proteinaG: z.coerce.number().min(0).max(1000),
  carbohidratosG: z.coerce.number().min(0).max(1000),
  grasasG: z.coerce.number().min(0).max(1000),
});

export async function editMealLogAction(input: unknown) {
  const session = await requireUsuaria();
  const data = editMealSchema.parse(input);

  const existing = await prisma.mealLog.findUnique({ where: { id: data.id } });
  if (!existing || existing.userId !== session.sub) {
    throw new Error("Registro no encontrado.");
  }
  if (!isSameDate(existing.fecha, today())) {
    throw new Error("Solo puedes editar registros del día de hoy.");
  }

  await prisma.mealLog.update({
    where: { id: data.id },
    data: {
      nombre: data.nombre,
      kcal: data.kcal,
      proteinaG: data.proteinaG,
      carbohidratosG: data.carbohidratosG,
      grasasG: data.grasasG,
    },
  });

  revalidatePath("/dashboard");
}

const idSchema = z.object({ id: z.string().min(1) });

export async function deleteMealLogAction(input: unknown) {
  const session = await requireUsuaria();
  const data = idSchema.parse(input);

  const existing = await prisma.mealLog.findUnique({ where: { id: data.id } });
  if (!existing || existing.userId !== session.sub) {
    throw new Error("Registro no encontrado.");
  }
  if (!isSameDate(existing.fecha, today())) {
    throw new Error("Solo puedes borrar registros del día de hoy.");
  }

  await prisma.mealLog.delete({ where: { id: data.id } });
  revalidatePath("/dashboard");
}

// ---------- Ejercicio ----------

const addExerciseSchema = z.object({
  exerciseTypeId: z.string().min(1),
  minutos: z.coerce.number().int().min(1).max(600),
});

export async function addExerciseLogAction(input: unknown) {
  const session = await requireUsuaria();
  const data = addExerciseSchema.parse(input);

  const exerciseType = await prisma.exerciseType.findUnique({
    where: { id: data.exerciseTypeId },
  });
  if (!exerciseType) throw new Error("Tipo de ejercicio no encontrado.");

  const pesoKg = await getLatestWeightKg(session.sub);
  const kcalQuemadas = calcExerciseKcal(exerciseType.met, pesoKg, data.minutos);

  await prisma.exerciseLog.create({
    data: {
      userId: session.sub,
      fecha: today(),
      exerciseTypeId: exerciseType.id,
      minutos: data.minutos,
      pesoUsadoKg: pesoKg,
      kcalQuemadas,
    },
  });

  revalidatePath("/dashboard");
}

export async function deleteExerciseLogAction(input: unknown) {
  const session = await requireUsuaria();
  const data = idSchema.parse(input);

  const existing = await prisma.exerciseLog.findUnique({ where: { id: data.id } });
  if (!existing || existing.userId !== session.sub) {
    throw new Error("Registro no encontrado.");
  }
  if (!isSameDate(existing.fecha, today())) {
    throw new Error("Solo puedes borrar registros del día de hoy.");
  }

  await prisma.exerciseLog.delete({ where: { id: data.id } });
  revalidatePath("/dashboard");
}

// ---------- Peso ----------

const addWeightSchema = z.object({
  pesoKg: z.coerce.number().min(20).max(300),
});

export async function addWeightLogAction(input: unknown) {
  const session = await requireUsuaria();
  const data = addWeightSchema.parse(input);
  const fecha = today();

  await prisma.weightLog.upsert({
    where: { userId_fecha: { userId: session.sub, fecha } },
    update: { pesoKg: data.pesoKg },
    create: { userId: session.sub, fecha, pesoKg: data.pesoKg },
  });

  revalidatePath("/dashboard");
  revalidatePath("/peso");
  revalidatePath("/historial");
}
