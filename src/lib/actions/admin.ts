"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/guards";
import { hashPassword } from "@/lib/auth/password";
import {
  today,
  computeBMR,
  computeGET,
  computeDeficitKcal,
  computeWeeklyBudget,
  activityFactorFor,
  ACTIVITY_LEVELS,
  OBJETIVOS_PRINCIPALES,
  type DeficitModo,
} from "@/lib/nutrition";
import { Weekday, MealType } from "@/generated/prisma/client";

const mealTypeSchema = z.nativeEnum(MealType);

const MEAL_TYPES = ["DESAYUNO", "ALMUERZO", "COMIDA", "COMIDA_LIBRE_SOCIAL", "CENA"] as const;
const WEEKDAYS = Object.values(Weekday);

const ACTIVITY_VALUES = ACTIVITY_LEVELS.map((a) => a.value) as [string, ...string[]];
const OBJETIVO_VALUES = OBJETIVOS_PRINCIPALES.map((o) => o.value) as [string, ...string[]];

/** deficitValor son kcal en modo manual (hasta ±2000) o un % en modo porcentaje (hasta ±80). */
function validarDeficitValor(
  data: { deficitModo: string; deficitValor: number },
  ctx: z.RefinementCtx,
) {
  const limite = data.deficitModo === "porcentaje" ? 80 : 2000;
  if (Math.abs(data.deficitValor) > limite) {
    ctx.addIssue({
      code: "custom",
      path: ["deficitValor"],
      message:
        data.deficitModo === "porcentaje"
          ? "El porcentaje tiene que estar entre -80 y 80."
          : "El déficit manual tiene que estar entre -2000 y 2000 kcal.",
    });
  }
}

/** BMR/GET/déficit/presupuesto salen siempre de aquí: nunca se piden a mano en el alta ni en la edición normal. */
function computeAutoProfileFields(input: {
  sexo: string;
  pesoKg: number;
  alturaCm: number;
  edad: number;
  factorActividadEtiqueta: string;
  factorActividadPersonalizado?: number;
  objetivoPrincipal: string;
  deficitModo: DeficitModo;
  deficitValor: number;
}) {
  const factorActividad =
    input.factorActividadEtiqueta === "personalizado"
      ? input.factorActividadPersonalizado
      : activityFactorFor(input.factorActividadEtiqueta);

  if (!factorActividad || factorActividad <= 0) {
    throw new Error("El factor de actividad tiene que ser mayor que 0.");
  }

  const bmrKcal = computeBMR(input.sexo, input.pesoKg, input.alturaCm, input.edad);
  const getKcal = computeGET(bmrKcal, factorActividad);
  const deficitDiarioKcal = computeDeficitKcal(getKcal, input.deficitModo, input.deficitValor);

  if (input.objetivoPrincipal === "reducir_grasa" && deficitDiarioKcal <= 0) {
    throw new Error("Con el objetivo \"Reducir grasa corporal\" el déficit tiene que ser mayor que 0.");
  }

  const presupuestoSemanalKcal = computeWeeklyBudget(getKcal - deficitDiarioKcal);

  return {
    bmrKcal,
    factorActividad,
    getKcal,
    deficitDiarioKcal,
    presupuestoSemanalKcal,
    deficitPorcentaje: input.deficitModo === "porcentaje" ? input.deficitValor : null,
  };
}

// ---------- Crear usuaria ----------

const createUsuariaSchema = z.object({
  name: z.string().trim().min(1, "Ponle un nombre"),
  email: z.string().trim().email("Email no válido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
  sexo: z.string().trim().min(1),
  edad: z.coerce.number().int().min(1).max(120),
  alturaCm: z.coerce.number().int().min(50).max(250),
  pesoInicialKg: z.coerce.number().min(20).max(300),
  pesoObjetivoKg: z.coerce.number().min(20).max(300).optional(),
  objetivoGrasaCorporalPct: z.coerce.number().min(0).max(100).optional(),
  objetivoPrincipal: z.enum(OBJETIVO_VALUES),
  factorActividadEtiqueta: z.enum(ACTIVITY_VALUES),
  factorActividadPersonalizado: z.coerce.number().min(0.5).max(3).optional(),
  deficitModo: z.enum(["porcentaje", "manual"]),
  deficitValor: z.coerce.number().min(-2000).max(2000),
  objetivoProteinaG: z.coerce.number().int().min(0).max(1000),
  objetivoGrasasG: z.coerce.number().int().min(0).max(1000),
  carbohidratosEntrenamientoG: z.coerce.number().int().min(0).max(1000),
  carbohidratosDescansoG: z.coerce.number().int().min(0).max(1000),
}).superRefine(validarDeficitValor);

export async function createUsuariaAction(input: unknown) {
  await requireAdmin();
  const data = createUsuariaSchema.parse(input);

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw new Error("Ya existe una cuenta con ese email.");

  const auto = computeAutoProfileFields({
    sexo: data.sexo,
    pesoKg: data.pesoInicialKg,
    alturaCm: data.alturaCm,
    edad: data.edad,
    factorActividadEtiqueta: data.factorActividadEtiqueta,
    factorActividadPersonalizado: data.factorActividadPersonalizado,
    objetivoPrincipal: data.objetivoPrincipal,
    deficitModo: data.deficitModo,
    deficitValor: data.deficitValor,
  });

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
        pesoObjetivoKg: data.pesoObjetivoKg ?? null,
        objetivoGrasaCorporalPct: data.objetivoGrasaCorporalPct ?? null,
        objetivoPrincipal: data.objetivoPrincipal,
        factorActividadEtiqueta: data.factorActividadEtiqueta,
        deficitModo: data.deficitModo,
        deficitPorcentaje: auto.deficitPorcentaje,
        bmrKcal: auto.bmrKcal,
        bmrEsManual: false,
        factorActividad: auto.factorActividad,
        getKcal: auto.getKcal,
        getEsManual: false,
        deficitDiarioKcal: auto.deficitDiarioKcal,
        objetivoProteinaG: data.objetivoProteinaG,
        objetivoGrasasG: data.objetivoGrasasG,
        presupuestoSemanalKcal: auto.presupuestoSemanalKcal,
      },
    });

    await tx.weightLog.create({
      data: { userId: user.id, fecha: today(), pesoKg: data.pesoInicialKg },
    });

    await tx.dayType.create({
      data: { userId: user.id, nombre: "Entrenamiento", carbohidratosG: data.carbohidratosEntrenamientoG },
    });
    await tx.dayType.create({
      data: {
        userId: user.id,
        nombre: "Descanso",
        carbohidratosG: data.carbohidratosDescansoG,
        predeterminado: true,
      },
    });

    for (const weekday of WEEKDAYS) {
      const dayPlan = await tx.dayPlan.create({
        data: { userId: user.id, weekday },
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
  pesoObjetivoKg: z.coerce.number().min(20).max(300).optional(),
  objetivoGrasaCorporalPct: z.coerce.number().min(0).max(100).optional(),
  objetivoPrincipal: z.enum(OBJETIVO_VALUES),
  factorActividadEtiqueta: z.enum(ACTIVITY_VALUES),
  factorActividadPersonalizado: z.coerce.number().min(0.5).max(3).optional(),
  deficitModo: z.enum(["porcentaje", "manual"]),
  deficitValor: z.coerce.number().min(-2000).max(2000),
  objetivoProteinaG: z.coerce.number().int().min(0).max(1000),
  objetivoGrasasG: z.coerce.number().int().min(0).max(1000),
  /** Fuerza recalcular BMR/GET/déficit/presupuesto aunque el perfil tuviera valores manuales antiguos. */
  recalcular: z.coerce.boolean().optional().default(false),
}).superRefine(validarDeficitValor);

export async function updateProfileAction(input: unknown) {
  await requireAdmin();
  const data = updateProfileSchema.parse(input);
  const { userId, recalcular, ...fields } = data;

  const existing = await prisma.profile.findUnique({ where: { userId } });
  if (!existing) throw new Error("Perfil no encontrado.");

  // Un perfil antiguo con BMR/GET puestos a mano no se toca solo: hace
  // falta pulsar "Recalcular". Uno que ya estaba en modo automático se
  // sigue recalculando en cada guardado, para que refleje los cambios.
  const debeRecalcular = recalcular || !existing.bmrEsManual;

  const autoFields = debeRecalcular
    ? (() => {
        const auto = computeAutoProfileFields({
          sexo: fields.sexo,
          pesoKg: fields.pesoInicialKg,
          alturaCm: fields.alturaCm,
          edad: fields.edad,
          factorActividadEtiqueta: fields.factorActividadEtiqueta,
          factorActividadPersonalizado: fields.factorActividadPersonalizado,
          objetivoPrincipal: fields.objetivoPrincipal,
          deficitModo: fields.deficitModo,
          deficitValor: fields.deficitValor,
        });
        return {
          bmrKcal: auto.bmrKcal,
          bmrEsManual: false,
          factorActividad: auto.factorActividad,
          getKcal: auto.getKcal,
          getEsManual: false,
          deficitDiarioKcal: auto.deficitDiarioKcal,
          presupuestoSemanalKcal: auto.presupuestoSemanalKcal,
          deficitPorcentaje: auto.deficitPorcentaje,
        };
      })()
    : {};

  await prisma.profile.update({
    where: { userId },
    data: {
      sexo: fields.sexo,
      edad: fields.edad,
      alturaCm: fields.alturaCm,
      pesoInicialKg: fields.pesoInicialKg,
      pesoObjetivoKg: fields.pesoObjetivoKg ?? null,
      objetivoGrasaCorporalPct: fields.objetivoGrasaCorporalPct ?? null,
      objetivoPrincipal: fields.objetivoPrincipal,
      factorActividadEtiqueta: fields.factorActividadEtiqueta,
      deficitModo: fields.deficitModo,
      objetivoProteinaG: fields.objetivoProteinaG,
      objetivoGrasasG: fields.objetivoGrasasG,
      ...autoFields,
    },
  });

  revalidatePath(`/admin/usuarias/${userId}`);
  revalidatePath(`/admin/usuarias/${userId}/plan`);
  revalidatePath("/dashboard");
  revalidatePath("/historial");
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

// ---------- Tipos de día ----------

const createDayTypeSchema = z.object({
  userId: z.string().min(1),
  nombre: z.string().trim().min(1, "Ponle un nombre"),
  carbohidratosG: z.coerce.number().int().min(0).max(1000),
});

export async function createDayTypeAction(input: unknown) {
  await requireAdmin();
  const data = createDayTypeSchema.parse(input);

  const existing = await prisma.dayType.findUnique({
    where: { userId_nombre: { userId: data.userId, nombre: data.nombre } },
  });
  if (existing) throw new Error("Ya existe un tipo de día con ese nombre.");

  await prisma.dayType.create({
    data: { userId: data.userId, nombre: data.nombre, carbohidratosG: data.carbohidratosG },
  });

  revalidatePath(`/admin/usuarias/${data.userId}/plan`);
}

const updateDayTypeSchema = z.object({
  userId: z.string().min(1),
  id: z.string().min(1),
  nombre: z.string().trim().min(1, "Ponle un nombre"),
  carbohidratosG: z.coerce.number().int().min(0).max(1000),
});

export async function updateDayTypeAction(input: unknown) {
  await requireAdmin();
  const data = updateDayTypeSchema.parse(input);

  const dayType = await prisma.dayType.findUnique({ where: { id: data.id } });
  if (!dayType || dayType.userId !== data.userId) throw new Error("Tipo de día no encontrado.");

  await prisma.dayType.update({
    where: { id: data.id },
    data: { nombre: data.nombre, carbohidratosG: data.carbohidratosG },
  });

  revalidatePath(`/admin/usuarias/${data.userId}/plan`);
  revalidatePath(`/admin/usuarias/${data.userId}`);
  revalidatePath("/dashboard");
  revalidatePath("/historial");
}

const deleteDayTypeSchema = z.object({
  userId: z.string().min(1),
  id: z.string().min(1),
});

export async function deleteDayTypeAction(input: unknown) {
  await requireAdmin();
  const data = deleteDayTypeSchema.parse(input);

  const [dayType, totalDayTypes] = await Promise.all([
    prisma.dayType.findUnique({
      where: { id: data.id },
      include: { _count: { select: { dayLogs: true } } },
    }),
    prisma.dayType.count({ where: { userId: data.userId } }),
  ]);
  if (!dayType || dayType.userId !== data.userId) throw new Error("Tipo de día no encontrado.");
  if (dayType._count.dayLogs > 0) {
    throw new Error("No se puede borrar: hay días que ya usan este tipo.");
  }
  if (dayType.predeterminado) {
    throw new Error("No se puede borrar el tipo predeterminado: marca otro como predeterminado primero.");
  }
  if (totalDayTypes <= 1) {
    throw new Error("Tiene que quedar al menos un tipo de día.");
  }

  await prisma.dayType.delete({ where: { id: data.id } });

  revalidatePath(`/admin/usuarias/${data.userId}/plan`);
}

const setDefaultDayTypeSchema = z.object({
  userId: z.string().min(1),
  id: z.string().min(1),
});

export async function setDefaultDayTypeAction(input: unknown) {
  await requireAdmin();
  const data = setDefaultDayTypeSchema.parse(input);

  const dayType = await prisma.dayType.findUnique({ where: { id: data.id } });
  if (!dayType || dayType.userId !== data.userId) throw new Error("Tipo de día no encontrado.");

  await prisma.$transaction([
    prisma.dayType.updateMany({ where: { userId: data.userId }, data: { predeterminado: false } }),
    prisma.dayType.update({ where: { id: data.id }, data: { predeterminado: true } }),
  ]);

  revalidatePath(`/admin/usuarias/${data.userId}/plan`);
  revalidatePath("/dashboard");
  revalidatePath("/historial");
}

// ---------- Menú semanal ----------

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

const createPlannedMealOptionSchema = z.object({
  userId: z.string().min(1),
  dayPlanId: z.string().min(1),
  mealType: mealTypeSchema,
  descripcion: z.string().trim().min(1, "Descríbelo"),
  kcal: z.coerce.number().int().min(0).max(10000),
  proteinaG: z.coerce.number().min(0).max(1000),
  carbohidratosG: z.coerce.number().min(0).max(1000),
  grasasG: z.coerce.number().min(0).max(1000),
});

/** Añade una opción más a una comida (p.ej. una tercera alternativa de almuerzo), sin tocar las que ya había. */
export async function createPlannedMealOptionAction(input: unknown) {
  await requireAdmin();
  const data = createPlannedMealOptionSchema.parse(input);

  const dayPlan = await prisma.dayPlan.findUnique({ where: { id: data.dayPlanId } });
  if (!dayPlan || dayPlan.userId !== data.userId) throw new Error("Día no encontrado.");

  await prisma.plannedMeal.create({
    data: {
      dayPlanId: data.dayPlanId,
      mealType: data.mealType,
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

const deletePlannedMealOptionSchema = z.object({
  userId: z.string().min(1),
  id: z.string().min(1),
});

export async function deletePlannedMealOptionAction(input: unknown) {
  await requireAdmin();
  const data = deletePlannedMealOptionSchema.parse(input);

  const plannedMeal = await prisma.plannedMeal.findUnique({
    where: { id: data.id },
    include: { dayPlan: true, _count: { select: { mealLogs: true } } },
  });
  if (!plannedMeal || plannedMeal.dayPlan.userId !== data.userId) {
    throw new Error("Plato no encontrado.");
  }

  // No se borra si alguna usuaria ya registró haberla comido: se pierde la
  // trazabilidad de ese registro. Se puede editar el texto/macros en su
  // lugar si hace falta corregirla.
  if (plannedMeal._count.mealLogs > 0) {
    throw new Error("No se puede borrar: alguna comida registrada usa esta opción.");
  }

  await prisma.plannedMeal.delete({ where: { id: data.id } });

  revalidatePath(`/admin/usuarias/${data.userId}/plan`);
}
