"use server";

import ExcelJS from "exceljs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/guards";
import { Weekday, MealType } from "@/generated/prisma/client";
import { upsertMealTemplate } from "@/lib/actions/mealTemplates";
import { normalizeSearchText } from "@/lib/text";

/**
 * Normaliza para comparar cabeceras/valores de Excel: minúsculas, sin
 * tildes, y cualquier separador (_, -, espacios de más...) colapsado a un
 * solo espacio — así "proteina_g", "Proteína (g)" y "proteina g" se
 * reconocen igual. Es más permisivo que normalizeSearchText (pensado para
 * el buscador de alimentos), a propósito para esta importación.
 */
function normalizeHeader(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const MAX_FILE_BYTES = 5 * 1024 * 1024;

const WEEKDAY_ALIASES: Record<string, Weekday> = {
  lunes: "LUNES",
  martes: "MARTES",
  miercoles: "MIERCOLES",
  jueves: "JUEVES",
  viernes: "VIERNES",
  sabado: "SABADO",
  domingo: "DOMINGO",
};

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
  dia: ["dia"],
  comida: ["comida", "tipo de comida"],
  descripcion: ["descripcion", "plato", "opcion"],
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

export type ImportResult = {
  totalFilas: number;
  creadas: number;
  errores: { fila: number; motivo: string }[];
};

/**
 * Añade opciones de comida planificada desde un Excel (columnas: día,
 * comida, descripción, kcal, proteína_g, carbohidratos_g, grasas_g).
 * Solo añade filas nuevas — nunca borra ni sustituye lo que ya había.
 */
export async function importPlannedMealsExcelAction(formData: FormData): Promise<ImportResult> {
  await requireAdmin();

  const userId = String(formData.get("userId") ?? "").trim();
  if (!userId) throw new Error("Falta la persona.");

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("Sube un archivo Excel (.xlsx).");
  if (file.size > MAX_FILE_BYTES) throw new Error("El archivo no puede pesar más de 5 MB.");

  const dayPlans = await prisma.dayPlan.findMany({ where: { userId } });
  if (dayPlans.length === 0) throw new Error("Esta persona no tiene menú semanal todavía.");
  const dayPlanByWeekday = new Map(dayPlans.map((d) => [d.weekday, d.id]));

  const yaExistentes = await prisma.plannedMeal.findMany({
    where: { dayPlanId: { in: dayPlans.map((d) => d.id) } },
    select: { dayPlanId: true, mealType: true, descripcion: true },
  });
  const clavesExistentes = new Set(
    yaExistentes.map((m) => `${m.dayPlanId}::${m.mealType}::${normalizeSearchText(m.descripcion)}`),
  );

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
    dia: findHeaderColumn(headerMap, "dia"),
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

  const errores: ImportResult["errores"] = [];
  const toCreate: {
    dayPlanId: string;
    mealType: MealType;
    descripcion: string;
    kcal: number;
    proteinaG: number;
    carbohidratosG: number;
    grasasG: number;
  }[] = [];

  const cellText = (row: ExcelJS.Row, col: number) => String(row.getCell(col).value ?? "").trim();
  const cellNumber = (row: ExcelJS.Row, col: number) => {
    const raw = row.getCell(col).value;
    if (typeof raw === "number") return raw;
    const parsed = Number(String(raw ?? "").replace(",", "."));
    return Number.isFinite(parsed) ? parsed : NaN;
  };

  let totalFilas = 0;
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return; // cabecera
    if (row.getCell(columns.dia!).value == null && row.getCell(columns.descripcion!).value == null) return; // fila vacía
    totalFilas += 1;

    const weekday = WEEKDAY_ALIASES[normalizeHeader(cellText(row, columns.dia!))];
    const mealType = MEAL_TYPE_ALIASES[normalizeHeader(cellText(row, columns.comida!))];
    const descripcion = cellText(row, columns.descripcion!);
    const kcal = cellNumber(row, columns.kcal!);
    const proteinaG = cellNumber(row, columns.proteinaG!);
    const carbohidratosG = cellNumber(row, columns.carbohidratosG!);
    const grasasG = cellNumber(row, columns.grasasG!);

    if (!weekday) return errores.push({ fila: rowNumber, motivo: `día no reconocido ("${cellText(row, columns.dia!)}")` });
    if (!mealType) return errores.push({ fila: rowNumber, motivo: `comida no reconocida ("${cellText(row, columns.comida!)}")` });
    if (!descripcion) return errores.push({ fila: rowNumber, motivo: "falta la descripción" });
    if (!Number.isFinite(kcal) || kcal < 0) return errores.push({ fila: rowNumber, motivo: "kcal no válida" });
    if ([proteinaG, carbohidratosG, grasasG].some((v) => !Number.isFinite(v) || v < 0)) {
      return errores.push({ fila: rowNumber, motivo: "macros no válidas" });
    }
    const dayPlanId = dayPlanByWeekday.get(weekday);
    if (!dayPlanId) return errores.push({ fila: rowNumber, motivo: "esta persona no tiene ese día configurado" });

    const clave = `${dayPlanId}::${mealType}::${normalizeSearchText(descripcion)}`;
    if (clavesExistentes.has(clave)) {
      return errores.push({ fila: rowNumber, motivo: "esa opción ya existe para ese día y esa comida" });
    }
    clavesExistentes.add(clave);

    toCreate.push({
      dayPlanId,
      mealType,
      descripcion,
      kcal: Math.round(kcal),
      proteinaG,
      carbohidratosG,
      grasasG,
    });
  });

  if (toCreate.length > 0) {
    await prisma.plannedMeal.createMany({ data: toCreate });
  }

  const guardarEnBiblioteca = String(formData.get("guardarEnBiblioteca") ?? "") === "true";
  if (guardarEnBiblioteca) {
    for (const meal of toCreate) {
      await upsertMealTemplate({
        mealType: meal.mealType,
        descripcion: meal.descripcion,
        kcal: meal.kcal,
        proteinaG: meal.proteinaG,
        carbohidratosG: meal.carbohidratosG,
        grasasG: meal.grasasG,
      });
    }
  }

  revalidatePath(`/admin/usuarias/${userId}/plan`);
  revalidatePath("/dashboard");
  revalidatePath("/historial");
  if (guardarEnBiblioteca) revalidatePath("/admin/platos");

  return { totalFilas, creadas: toCreate.length, errores };
}
