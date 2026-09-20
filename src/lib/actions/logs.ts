"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUsuaria } from "@/lib/auth/guards";
import { calcExerciseKcal, today, dateKeyToDate, dateToWeekday } from "@/lib/nutrition";
import { MealType } from "@/generated/prisma/client";

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

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

const dateKeySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .optional();

/** Fecha a usar para un registro: la que se pase, o hoy si no se indica. No se permiten fechas futuras. */
function resolveFecha(dateKey: string | undefined): Date {
  const fecha = dateKey ? dateKeyToDate(dateKey) : today();
  if (fecha.getTime() > today().getTime()) {
    throw new Error("No se puede registrar en una fecha futura.");
  }
  return fecha;
}

const mealTypeSchema = z.nativeEnum(MealType);

// ---------- Tipo de día ----------

const setDayTypeSchema = z.object({
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dayTypeId: z.string().min(1),
});

export async function setDayTypeAction(input: unknown) {
  const session = await requireUsuaria();
  const data = setDayTypeSchema.parse(input);
  const fecha = resolveFecha(data.fecha);

  const dayType = await prisma.dayType.findUnique({ where: { id: data.dayTypeId } });
  if (!dayType || dayType.userId !== session.sub) throw new Error("Tipo de día no encontrado.");

  await prisma.dayLog.upsert({
    where: { userId_fecha: { userId: session.sub, fecha } },
    update: { dayTypeId: data.dayTypeId },
    create: { userId: session.sub, fecha, dayTypeId: data.dayTypeId },
  });

  revalidatePath("/dashboard");
  revalidatePath("/historial");
}

// ---------- Comidas ----------

const addPlannedMealSchema = z.object({
  plannedMealId: z.string().min(1),
  mealType: mealTypeSchema,
  fecha: dateKeySchema,
});

export async function addPlannedMealLogAction(input: unknown) {
  const session = await requireUsuaria();
  const data = addPlannedMealSchema.parse(input);
  const fecha = resolveFecha(data.fecha);

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
      fecha,
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
  revalidatePath("/historial");
}

const freeMealSchema = z.object({
  mealType: mealTypeSchema,
  nombre: z.string().trim().min(1, "Ponle un nombre al plato"),
  kcal: z.coerce.number().min(0).max(10000),
  proteinaG: z.coerce.number().min(0).max(1000),
  carbohidratosG: z.coerce.number().min(0).max(1000),
  grasasG: z.coerce.number().min(0).max(1000),
  fecha: dateKeySchema,
  guardarComoOpcion: z.coerce.boolean().optional().default(false),
});

export async function addFreeMealLogAction(input: unknown) {
  const session = await requireUsuaria();
  const data = freeMealSchema.parse(input);
  const fecha = resolveFecha(data.fecha);

  await prisma.mealLog.create({
    data: {
      userId: session.sub,
      fecha,
      mealType: data.mealType,
      source: "LIBRE",
      nombre: data.nombre,
      kcal: data.kcal,
      proteinaG: data.proteinaG,
      carbohidratosG: data.carbohidratosG,
      grasasG: data.grasasG,
    },
  });

  if (data.guardarComoOpcion) {
    const weekday = dateToWeekday(fecha);
    const dayPlan = await prisma.dayPlan.findUnique({
      where: { userId_weekday: { userId: session.sub, weekday } },
    });
    if (dayPlan) {
      await prisma.plannedMeal.create({
        data: {
          dayPlanId: dayPlan.id,
          mealType: data.mealType,
          descripcion: data.nombre,
          kcal: data.kcal,
          proteinaG: data.proteinaG,
          carbohidratosG: data.carbohidratosG,
          grasasG: data.grasasG,
        },
      });
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/historial");
  if (data.guardarComoOpcion) revalidatePath(`/admin/usuarias/${session.sub}/plan`);
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
  revalidatePath("/historial");
}

const idSchema = z.object({ id: z.string().min(1) });

export async function deleteMealLogAction(input: unknown) {
  const session = await requireUsuaria();
  const data = idSchema.parse(input);

  const existing = await prisma.mealLog.findUnique({ where: { id: data.id } });
  if (!existing || existing.userId !== session.sub) {
    throw new Error("Registro no encontrado.");
  }

  await prisma.mealLog.delete({ where: { id: data.id } });
  revalidatePath("/dashboard");
  revalidatePath("/historial");
}

// ---------- Ejercicio ----------

const addExerciseSchema = z.object({
  exerciseTypeId: z.string().min(1),
  minutos: z.coerce.number().int().min(1).max(600),
  fecha: dateKeySchema,
});

export async function addExerciseLogAction(input: unknown) {
  const session = await requireUsuaria();
  const data = addExerciseSchema.parse(input);
  const fecha = resolveFecha(data.fecha);

  const exerciseType = await prisma.exerciseType.findUnique({
    where: { id: data.exerciseTypeId },
  });
  if (!exerciseType) throw new Error("Tipo de ejercicio no encontrado.");

  const pesoKg = await getLatestWeightKg(session.sub);
  const kcalQuemadas = calcExerciseKcal(exerciseType.met, pesoKg, data.minutos);

  await prisma.exerciseLog.create({
    data: {
      userId: session.sub,
      fecha,
      exerciseTypeId: exerciseType.id,
      minutos: data.minutos,
      pesoUsadoKg: pesoKg,
      kcalQuemadas,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/historial");
}

export async function deleteExerciseLogAction(input: unknown) {
  const session = await requireUsuaria();
  const data = idSchema.parse(input);

  const existing = await prisma.exerciseLog.findUnique({ where: { id: data.id } });
  if (!existing || existing.userId !== session.sub) {
    throw new Error("Registro no encontrado.");
  }

  await prisma.exerciseLog.delete({ where: { id: data.id } });
  revalidatePath("/dashboard");
  revalidatePath("/historial");
}

// ---------- Peso y composición corporal ----------

function numberOrNull(value: FormDataEntryValue | null): number | null {
  if (value === null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

const weightFieldsSchema = z.object({
  fecha: dateKeySchema,
  pesoKg: z.coerce.number().min(20).max(300),
  grasaCorporalPct: z.number().min(0).max(100).nullable(),
  masaMuscularKg: z.number().min(0).max(300).nullable(),
  pliegues: z.number().min(0).max(200).nullable(),
  aguaCorporalPct: z.number().min(0).max(100).nullable(),
  grasaVisceral: z.number().min(0).max(100).nullable(),
  tasaMetabolicaBasalKcal: z.number().int().min(0).max(10000).nullable(),
});

/** Acepta un FormData (para poder incluir una imagen opcional del informe de la báscula). */
export async function addWeightLogAction(formData: FormData) {
  const session = await requireUsuaria();

  const data = weightFieldsSchema.parse({
    fecha: formData.get("fecha") || undefined,
    pesoKg: formData.get("pesoKg"),
    grasaCorporalPct: numberOrNull(formData.get("grasaCorporalPct")),
    masaMuscularKg: numberOrNull(formData.get("masaMuscularKg")),
    pliegues: numberOrNull(formData.get("pliegues")),
    aguaCorporalPct: numberOrNull(formData.get("aguaCorporalPct")),
    grasaVisceral: numberOrNull(formData.get("grasaVisceral")),
    tasaMetabolicaBasalKcal: numberOrNull(formData.get("tasaMetabolicaBasalKcal")),
  });
  const fecha = resolveFecha(data.fecha);

  const imagenFile = formData.get("imagen");
  let imagenData: { imagen: Uint8Array<ArrayBuffer>; imagenMime: string } | null = null;
  if (imagenFile instanceof File && imagenFile.size > 0) {
    if (imagenFile.size > MAX_IMAGE_BYTES) throw new Error("La imagen no puede pesar más de 4 MB.");
    if (!imagenFile.type.startsWith("image/")) throw new Error("El archivo tiene que ser una imagen.");
    imagenData = {
      imagen: new Uint8Array(await imagenFile.arrayBuffer()) as Uint8Array<ArrayBuffer>,
      imagenMime: imagenFile.type,
    };
  }

  const fields = {
    pesoKg: data.pesoKg,
    grasaCorporalPct: data.grasaCorporalPct,
    masaMuscularKg: data.masaMuscularKg,
    pliegues: data.pliegues,
    aguaCorporalPct: data.aguaCorporalPct,
    grasaVisceral: data.grasaVisceral,
    tasaMetabolicaBasalKcal: data.tasaMetabolicaBasalKcal,
  };

  await prisma.weightLog.upsert({
    where: { userId_fecha: { userId: session.sub, fecha } },
    update: { ...fields, ...imagenData },
    create: { userId: session.sub, fecha, ...fields, ...imagenData },
  });

  revalidatePath("/dashboard");
  revalidatePath("/peso");
  revalidatePath("/historial");
}

export async function deleteWeightLogAction(input: unknown) {
  const session = await requireUsuaria();
  const data = idSchema.parse(input);

  const existing = await prisma.weightLog.findUnique({ where: { id: data.id } });
  if (!existing || existing.userId !== session.sub) {
    throw new Error("Registro no encontrado.");
  }

  await prisma.weightLog.delete({ where: { id: data.id } });
  revalidatePath("/dashboard");
  revalidatePath("/peso");
  revalidatePath("/historial");
}
