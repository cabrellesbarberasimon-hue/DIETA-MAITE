"use server";

import ExcelJS from "exceljs";
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

const MAX_FILE_BYTES = 5 * 1024 * 1024;

/** Igual que en import.ts: minúsculas, sin tildes, separadores colapsados. */
function normalizeHeader(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const MEAL_TYPE_ALIASES: Record<string, MealType> = {
  desayuno: "DESAYUNO",
  almuerzo: "ALMUERZO",
  comida: "COMIDA",
  "comida libre": "COMIDA_LIBRE_SOCIAL",
  "comida libre social": "COMIDA_LIBRE_SOCIAL",
  "comida social": "COMIDA_LIBRE_SOCIAL",
  cena: "CENA",
};

const HEADER_ALIASES: Record<string, string[]> = {
  comida: ["comida", "tipo de comida"],
  descripcion: ["descripcion", "plato", "opcion", "nombre"],
  kcal: ["kcal", "calorias"],
  proteinaG: ["proteina g", "proteina", "proteinas g", "proteinas"],
  carbohidratosG: ["carbohidratos g", "carbohidratos", "carbos g", "carbos"],
  grasasG: ["grasas g", "grasas", "grasa g", "grasa"],
};

function findHeaderColumn(headerMap: Map<string, number>, field: string): number | null {
  for (const alias of HEADER_ALIASES[field]) {
    const col = headerMap.get(alias);
    if (col) return col;
  }
  return null;
}

export type ImportMealTemplatesResult = {
  totalFilas: number;
  creadas: number;
  errores: { fila: number; motivo: string }[];
};

/**
 * Importa platos directamente a la biblioteca compartida, sin depender de
 * ninguna persona ni día concreto (a diferencia de importPlannedMealsExcelAction
 * en import.ts, que sí añade opciones al menú de alguien). Columnas: comida,
 * descripción, kcal, proteína_g, carbohidratos_g, grasas_g. No duplica los
 * platos que ya estén en la biblioteca (mismo tipo de comida y descripción).
 */
export async function importMealTemplatesExcelAction(formData: FormData): Promise<ImportMealTemplatesResult> {
  await requireAdmin();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("Sube un archivo Excel (.xlsx).");
  if (file.size > MAX_FILE_BYTES) throw new Error("El archivo no puede pesar más de 5 MB.");

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  const worksheet = workbook.worksheets[0];
  if (!worksheet) throw new Error("El Excel no tiene ninguna hoja.");

  const headerMap = new Map<string, number>();
  worksheet.getRow(1).eachCell((cell, colNumber) => {
    const key = normalizeHeader(String(cell.value ?? ""));
    if (key) headerMap.set(key, colNumber);
  });

  const columns = {
    comida: findHeaderColumn(headerMap, "comida"),
    descripcion: findHeaderColumn(headerMap, "descripcion"),
    kcal: findHeaderColumn(headerMap, "kcal"),
    proteinaG: findHeaderColumn(headerMap, "proteinaG"),
    carbohidratosG: findHeaderColumn(headerMap, "carbohidratosG"),
    grasasG: findHeaderColumn(headerMap, "grasasG"),
  };
  const missingColumns = Object.entries(columns)
    .filter(([, col]) => col === null)
    .map(([field]) => field);
  if (missingColumns.length > 0) {
    throw new Error(`Faltan columnas en el Excel: ${missingColumns.join(", ")}.`);
  }

  const cellText = (row: ExcelJS.Row, col: number) => String(row.getCell(col).value ?? "").trim();
  const cellNumber = (row: ExcelJS.Row, col: number) => {
    const raw = row.getCell(col).value;
    if (typeof raw === "number") return raw;
    const parsed = Number(String(raw ?? "").replace(",", "."));
    return Number.isFinite(parsed) ? parsed : NaN;
  };

  const errores: ImportMealTemplatesResult["errores"] = [];
  const toCreate: {
    mealType: MealType;
    descripcion: string;
    busqueda: string;
    kcal: number;
    proteinaG: number;
    carbohidratosG: number;
    grasasG: number;
  }[] = [];

  let totalFilas = 0;
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return; // cabecera
    if (row.getCell(columns.descripcion!).value == null) return; // fila vacía
    totalFilas += 1;

    const mealType = MEAL_TYPE_ALIASES[normalizeHeader(cellText(row, columns.comida!))];
    const descripcion = cellText(row, columns.descripcion!);
    const kcal = cellNumber(row, columns.kcal!);
    const proteinaG = cellNumber(row, columns.proteinaG!);
    const carbohidratosG = cellNumber(row, columns.carbohidratosG!);
    const grasasG = cellNumber(row, columns.grasasG!);

    if (!mealType) return errores.push({ fila: rowNumber, motivo: `comida no reconocida ("${cellText(row, columns.comida!)}")` });
    if (!descripcion) return errores.push({ fila: rowNumber, motivo: "falta la descripción" });
    if (!Number.isFinite(kcal) || kcal < 0) return errores.push({ fila: rowNumber, motivo: "kcal no válida" });
    if ([proteinaG, carbohidratosG, grasasG].some((v) => !Number.isFinite(v) || v < 0)) {
      return errores.push({ fila: rowNumber, motivo: "macros no válidas" });
    }

    toCreate.push({
      mealType,
      descripcion,
      busqueda: normalizeSearchText(descripcion),
      kcal: Math.round(kcal),
      proteinaG,
      carbohidratosG,
      grasasG,
    });
  });

  // Evita duplicados dentro del propio archivo y contra lo que ya hay en la
  // biblioteca (mismo tipo de comida + descripción normalizada).
  const existing = await prisma.mealTemplate.findMany({
    where: { mealType: { in: [...new Set(toCreate.map((r) => r.mealType))] } },
    select: { mealType: true, busqueda: true },
  });
  const existingKeys = new Set(existing.map((e) => `${e.mealType}::${e.busqueda}`));
  const seenInFile = new Set<string>();
  const rowsToInsert = toCreate.filter((r) => {
    const key = `${r.mealType}::${r.busqueda}`;
    if (existingKeys.has(key) || seenInFile.has(key)) return false;
    seenInFile.add(key);
    return true;
  });

  if (rowsToInsert.length > 0) {
    await prisma.mealTemplate.createMany({ data: rowsToInsert });
  }

  revalidatePath("/admin/platos");

  return { totalFilas, creadas: rowsToInsert.length, errores };
}

const deleteSchema = z.object({ id: z.string().min(1) });

export async function deleteMealTemplateAction(input: unknown): Promise<void> {
  await requireAdmin();
  const { id } = deleteSchema.parse(input);

  await prisma.mealTemplate.delete({ where: { id } });

  revalidatePath("/admin/platos");
}
