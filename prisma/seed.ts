import "dotenv/config";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

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
  objetivo: {
    kcal: number;
    proteina_g: number;
    carbohidratos_g: number;
    grasas_g: number;
  };
};

type SeedJson = {
  dias: Record<string, SeedDia>;
  met_table: Record<string, number>;
  perfil: {
    nombre: string;
    sexo: string;
    edad: number;
    altura_cm: number;
    peso_inicial_kg: number;
    peso_objetivo_kg: number;
    bmr_kcal: number;
    factor_actividad: number;
    get_kcal: number;
    deficit_diario_kcal: number;
    objetivo_kcal_media_dia: number;
    presupuesto_semanal_kcal: number;
  };
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

async function main() {
  const seedPath = join(__dirname, "seed-data", "dieta_maite_seed.json");
  const seed: SeedJson = JSON.parse(readFileSync(seedPath, "utf-8"));

  const maiteEmail = process.env.SEED_MAITE_EMAIL ?? "maite@example.com";
  const maitePassword = process.env.SEED_MAITE_PASSWORD ?? "maite1234";
  const simonEmail = process.env.SEED_SIMON_EMAIL ?? "simon@example.com";
  const simonPassword = process.env.SEED_SIMON_PASSWORD ?? "simon1234";

  const maiteHash = await bcrypt.hash(maitePassword, 10);
  const simonHash = await bcrypt.hash(simonPassword, 10);

  const maite = await prisma.user.upsert({
    where: { email: maiteEmail },
    update: {},
    create: {
      email: maiteEmail,
      passwordHash: maiteHash,
      name: seed.perfil.nombre,
      role: "USUARIA",
    },
  });

  await prisma.user.upsert({
    where: { email: simonEmail },
    update: {},
    create: {
      email: simonEmail,
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
      objetivoKcalMediaDia: seed.perfil.objetivo_kcal_media_dia,
      presupuestoSemanalKcal: seed.perfil.presupuesto_semanal_kcal,
    },
  });

  await prisma.weightLog.upsert({
    where: { userId_fecha: { userId: maite.id, fecha: new Date() } },
    update: { pesoKg: seed.perfil.peso_inicial_kg },
    create: {
      userId: maite.id,
      fecha: new Date(),
      pesoKg: seed.perfil.peso_inicial_kg,
    },
  });

  for (const [diaKey, dia] of Object.entries(seed.dias)) {
    const weekday = WEEKDAY_MAP[diaKey];
    if (!weekday) throw new Error(`Día no reconocido en el seed: ${diaKey}`);

    const dayPlan = await prisma.dayPlan.upsert({
      where: { weekday: weekday as never },
      update: {
        tipoDia: dia.tipo_dia,
        objetivoKcal: dia.objetivo.kcal,
        objetivoProteinaG: dia.objetivo.proteina_g,
        objetivoCarbohidratosG: dia.objetivo.carbohidratos_g,
        objetivoGrasasG: dia.objetivo.grasas_g,
      },
      create: {
        weekday: weekday as never,
        tipoDia: dia.tipo_dia,
        objetivoKcal: dia.objetivo.kcal,
        objetivoProteinaG: dia.objetivo.proteina_g,
        objetivoCarbohidratosG: dia.objetivo.carbohidratos_g,
        objetivoGrasasG: dia.objetivo.grasas_g,
      },
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

  console.log("Seed completado:");
  console.log(`  Usuaria: ${maiteEmail}`);
  console.log(`  Admin:   ${simonEmail}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
