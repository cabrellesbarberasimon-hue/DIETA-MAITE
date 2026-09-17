import "server-only";
import bcrypt from "bcryptjs";
import type { PrismaClient } from "@/generated/prisma/client";
import { today } from "@/lib/nutrition";
import { normalizeSearchText } from "@/lib/text";
import seed from "@/lib/seed-data/dieta_maite_seed.json";
import foods from "@/lib/seed-data/foods.json";

type SeedComida = {
  descripcion: string;
  kcal: number;
  proteina_g: number;
  carbohidratos_g: number;
  grasas_g: number;
};

type SeedDia = {
  tipo_dia: string;
  comidas: Record<string, SeedComida>;
};

const WEEKDAY_MAP: Record<string, string> = {
  LUNES: "LUNES",
  MARTES: "MARTES",
  MIÉRCOLES: "MIERCOLES",
  MIERCOLES: "MIERCOLES",
  JUEVES: "JUEVES",
  VIERNES: "VIERNES",
  SÁBADO: "SABADO",
  SABADO: "SABADO",
  DOMINGO: "DOMINGO",
};

const MEAL_TYPE_MAP: Record<string, string> = {
  DESAYUNO: "DESAYUNO",
  ALMUERZO: "ALMUERZO",
  COMIDA: "COMIDA",
  COMIDA_LIBRE_SOCIAL: "COMIDA_LIBRE_SOCIAL",
  CENA: "CENA",
};

const DEFAULT_OBJETIVO_PROTEINA_G = 100;
const DEFAULT_OBJETIVO_GRASAS_G = 47;
const ENTRENAMIENTO_CARBOHIDRATOS_G = 150;
const DESCANSO_CARBOHIDRATOS_G = 100;

export type SeedOptions = {
  maiteEmail: string;
  maitePassword: string;
  simonEmail: string;
  simonPassword: string;
};

export type SeedResult = {
  maiteEmail: string;
  simonEmail: string;
  alreadySeeded: boolean;
};

/**
 * Carga usuarios, perfil, menú semanal y tabla MET desde dieta_maite_seed.json,
 * y la tabla de alimentos desde foods.json (esta última compartida, no ligada
 * a ninguna usuaria). Idempotente para todo salvo la contraseña: visitar este
 * endpoint de nuevo (con el token) resincroniza las contraseñas de Maite y
 * Simón con SEED_MAITE_PASSWORD/SEED_SIMON_PASSWORD, a propósito, como forma
 * simple de "resetearlas" si hace falta.
 */
export async function runSeed(prisma: PrismaClient, options: SeedOptions): Promise<SeedResult> {
  const [existingMaite, existingSimon] = await Promise.all([
    prisma.user.findUnique({ where: { email: options.maiteEmail } }),
    prisma.user.findUnique({ where: { email: options.simonEmail } }),
  ]);
  const alreadySeeded = Boolean(existingMaite && existingSimon);

  const maiteHash = await bcrypt.hash(options.maitePassword, 10);
  const simonHash = await bcrypt.hash(options.simonPassword, 10);

  const maite = await prisma.user.upsert({
    where: { email: options.maiteEmail },
    update: { passwordHash: maiteHash },
    create: {
      email: options.maiteEmail,
      passwordHash: maiteHash,
      name: seed.perfil.nombre,
      role: "USUARIA",
    },
  });

  await prisma.user.upsert({
    where: { email: options.simonEmail },
    update: { passwordHash: simonHash },
    create: {
      email: options.simonEmail,
      passwordHash: simonHash,
      name: "Simón",
      role: "ADMIN",
    },
  });

  await prisma.profile.upsert({
    where: { userId: maite.id },
    update: {},
    create: {
      userId: maite.id,
      sexo: seed.perfil.sexo,
      edad: seed.perfil.edad,
      alturaCm: seed.perfil.altura_cm,
      pesoInicialKg: seed.perfil.peso_inicial_kg,
      pesoObjetivoKg: seed.perfil.peso_objetivo_kg,
      bmrKcal: seed.perfil.bmr_kcal,
      factorActividad: seed.perfil.factor_actividad,
      getKcal: seed.perfil.get_kcal,
      deficitDiarioKcal: seed.perfil.deficit_diario_kcal,
      objetivoProteinaG: DEFAULT_OBJETIVO_PROTEINA_G,
      objetivoGrasasG: DEFAULT_OBJETIVO_GRASAS_G,
      presupuestoSemanalKcal: seed.perfil.presupuesto_semanal_kcal,
    },
  });

  const fecha = today();
  await prisma.weightLog.upsert({
    where: { userId_fecha: { userId: maite.id, fecha } },
    update: {},
    create: {
      userId: maite.id,
      fecha,
      pesoKg: seed.perfil.peso_inicial_kg,
    },
  });

  const dayTypeEntrenamiento = await prisma.dayType.upsert({
    where: { userId_nombre: { userId: maite.id, nombre: "Entrenamiento" } },
    update: {},
    create: { userId: maite.id, nombre: "Entrenamiento", carbohidratosG: ENTRENAMIENTO_CARBOHIDRATOS_G },
  });
  const dayTypeDescanso = await prisma.dayType.upsert({
    where: { userId_nombre: { userId: maite.id, nombre: "Descanso" } },
    update: {},
    create: { userId: maite.id, nombre: "Descanso", carbohidratosG: DESCANSO_CARBOHIDRATOS_G },
  });

  for (const [diaKey, dia] of Object.entries(seed.dias as Record<string, SeedDia>)) {
    const weekday = WEEKDAY_MAP[diaKey];
    if (!weekday) throw new Error(`Día no reconocido en el seed: ${diaKey}`);

    const dayType = /CARDIO/i.test(dia.tipo_dia) ? dayTypeEntrenamiento : dayTypeDescanso;

    const dayPlan = await prisma.dayPlan.upsert({
      where: { userId_weekday: { userId: maite.id, weekday: weekday as never } },
      update: { dayTypeId: dayType.id },
      create: { userId: maite.id, weekday: weekday as never, dayTypeId: dayType.id },
    });

    for (const [comidaKey, comida] of Object.entries(dia.comidas)) {
      const mealType = MEAL_TYPE_MAP[comidaKey];
      if (!mealType) throw new Error(`Comida no reconocida en el seed: ${comidaKey}`);

      await prisma.plannedMeal.upsert({
        where: {
          dayPlanId_mealType: { dayPlanId: dayPlan.id, mealType: mealType as never },
        },
        update: {
          descripcion: comida.descripcion,
          kcal: comida.kcal,
          proteinaG: comida.proteina_g,
          carbohidratosG: comida.carbohidratos_g,
          grasasG: comida.grasas_g,
        },
        create: {
          dayPlanId: dayPlan.id,
          mealType: mealType as never,
          descripcion: comida.descripcion,
          kcal: comida.kcal,
          proteinaG: comida.proteina_g,
          carbohidratosG: comida.carbohidratos_g,
          grasasG: comida.grasas_g,
        },
      });
    }
  }

  let orden = 0;
  for (const [nombre, met] of Object.entries(seed.met_table)) {
    await prisma.exerciseType.upsert({
      where: { nombre },
      update: { met, orden },
      create: { nombre, met, orden },
    });
    orden += 1;
  }

  await seedFoods(prisma);

  return { maiteEmail: options.maiteEmail, simonEmail: options.simonEmail, alreadySeeded };
}

/** Tabla de alimentos de referencia, compartida por todas las usuarias. */
async function seedFoods(prisma: PrismaClient) {
  const count = await prisma.food.count();
  if (count > 0) return;

  await prisma.food.createMany({
    data: foods.map((f) => ({ ...f, busqueda: normalizeSearchText(f.nombre) })),
    skipDuplicates: true,
  });
}
