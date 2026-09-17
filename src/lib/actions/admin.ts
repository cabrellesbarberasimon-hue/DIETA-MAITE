"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/guards";
import { hashPassword } from "@/lib/auth/password";
import { today } from "@/lib/nutrition";
import { Weekday } from "@/generated/prisma/client";

const MEAL_TYPES = ["DESAYUNO", "ALMUERZO", "COMIDA", "COMIDA_LIBRE_SOCIAL", "CENA"] as const;
const WEEKDAYS = Object.values(Weekday);

// ---------- Crear usuaria ----------

const createUsuariaSchema = z.object({
  name: z.string().trim().min(1, "Ponle un nombre"),
  email: z.string().trim().email("Email no válido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
  sexo: z.string().trim().min(1),
  edad: z.coerce.number().int().min(1).max(120),
  alturaCm: z.coerce.number().int().min(50).max(250),
  pesoInicialKg: z.coerce.number().min(20).max(300),
  pesoObjetivoKg: z.coerce.number().min(20).max(300),
  bmrKcal: z.coerce.number().int().min(0).max(10000),
  factorActividad: z.coerce.number().min(0.5).max(3),
  getKcal: z.coerce.number().int().min(0).max(10000),
  deficitDiarioKcal: z.coerce.number().int().min(-2000).max(2000),
  objetivoKcalMediaDia: z.coerce.number().int().min(0).max(10000),
  presupuestoSemanalKcal: z.coerce.number().int().min(0).max(70000),
});

export async function createUsuariaAction(input: unknown) {
  await requireAdmin();
  const data = createUsuariaSchema.parse(input);

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw new Error("Ya existe una cuenta con ese email.");

  const passwordHash = await hashPassword(data.password);

  const usuaria = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { name: data.name, email: data.email, passwordHash, role: "USUARIA" },
    });

    await tx.profile.create({
      data: {
        userId: user.id,
        sexo: data.sexo,
        edad: data.edad,
        alturaCm: data.alturaCm,
        pesoInicialKg: data.pesoInicialKg,
        pesoObjetivoKg: data.pesoObjetivoKg,
        bmrKcal: data.bmrKcal,
        factorActividad: data.factorActividad,
        getKcal: data.getKcal,
        deficitDiarioKcal: data.deficitDiarioKcal,
        objetivoKcalMediaDia: data.objetivoKcalMediaDia,
        presupuestoSemanalKcal: data.presupuestoSemanalKcal,
      },
    });

    await tx.weightLog.create({
      data: { userId: user.id, fecha: today(), pesoKg: data.pesoInicialKg },
    });

    for (const weekday of WEEKDAYS) {
      const dayPlan = await tx.dayPlan.create({
        data: {
          userId: user.id,
          weekday,
          tipoDia: "Sin planificar",
          objetivoKcal: data.objetivoKcalMediaDia,
          objetivoProteinaG: 0,
          objetivoCarbohidratosG: 0,
          objetivoGrasasG: 0,
        },
      });

      for (const mealType of MEAL_TYPES) {
        await tx.plannedMeal.create({
          data: {
            dayPlanId: dayPlan.id,
            mealType,
            descripcion: "Sin planificar todavía",
            kcal: 0,
            proteinaG: 0,
            carbohidratosG: 0,
            grasasG: 0,
          },
        });
      }
    }

    return user;
  });

  revalidatePath("/admin");
  redirect(`/admin/usuarias/${usuaria.id}`);
}

// ---------- Perfil ----------

const updateProfileSchema = z.object({
  userId: z.string().min(1),
  sexo: z.string().trim().min(1),
  edad: z.coerce.number().int().min(1).max(120),
  alturaCm: z.coerce.number().int().min(50).max(250),
  pesoInicialKg: z.coerce.number().min(20).max(300),
  pesoObjetivoKg: z.coerce.number().min(20).max(300),
  bmrKcal: z.coerce.number().int().min(0).max(10000),
  factorActividad: z.coerce.number().min(0.5).max(3),
  getKcal: z.coerce.number().int().min(0).max(10000),
  deficitDiarioKcal: z.coerce.number().int().min(-2000).max(2000),
  objetivoKcalMediaDia: z.coerce.number().int().min(0).max(10000),
  presupuestoSemanalKcal: z.coerce.number().int().min(0).max(70000),
});

export async function updateProfileAction(input: unknown) {
  await requireAdmin();
  const data = updateProfileSchema.parse(input);
  const { userId, ...fields } = data;

  await prisma.profile.update({ where: { userId }, data: fields });

  revalidatePath(`/admin/usuarias/${userId}`);
  revalidatePath(`/admin/usuarias/${userId}/plan`);
}

// ---------- Peso actual ----------

const updateWeightSchema = z.object({
  userId: z.string().min(1),
  pesoKg: z.coerce.number().min(20).max(300),
});

export async function updateUsuariaWeightAction(input: unknown) {
  await requireAdmin();
  const data = updateWeightSchema.parse(input);
  const fecha = today();

  await prisma.weightLog.upsert({
    where: { userId_fecha: { userId: data.userId, fecha } },
    update: { pesoKg: data.pesoKg },
    create: { userId: data.userId, fecha, pesoKg: data.pesoKg },
  });

  revalidatePath(`/admin/usuarias/${data.userId}`);
  revalidatePath(`/admin/usuarias/${data.userId}/plan`);
}

// ---------- Menú semanal ----------

const updateDayPlanSchema = z.object({
  userId: z.string().min(1),
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
    where: { userId_weekday: { userId: data.userId, weekday: data.weekday } },
    data: {
      tipoDia: data.tipoDia,
      objetivoKcal: data.objetivoKcal,
      objetivoProteinaG: data.objetivoProteinaG,
      objetivoCarbohidratosG: data.objetivoCarbohidratosG,
      objetivoGrasasG: data.objetivoGrasasG,
    },
  });

  revalidatePath(`/admin/usuarias/${data.userId}/plan`);
  revalidatePath(`/admin/usuarias/${data.userId}`);
  revalidatePath("/dashboard");
  revalidatePath("/historial");
}

const updatePlannedMealSchema = z.object({
  userId: z.string().min(1),
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

  const plannedMeal = await prisma.plannedMeal.findUnique({
    where: { id: data.id },
    include: { dayPlan: true },
  });
  if (!plannedMeal || plannedMeal.dayPlan.userId !== data.userId) {
    throw new Error("Plato no encontrado.");
  }

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

  revalidatePath(`/admin/usuarias/${data.userId}/plan`);
  revalidatePath("/dashboard");
  revalidatePath("/historial");
}
