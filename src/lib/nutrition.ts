import type { Weekday } from "@/generated/prisma/client";

export const WEEKDAY_ORDER: Weekday[] = [
  "LUNES",
  "MARTES",
  "MIERCOLES",
  "JUEVES",
  "VIERNES",
  "SABADO",
  "DOMINGO",
];

export const WEEKDAY_LABEL: Record<Weekday, string> = {
  LUNES: "Lunes",
  MARTES: "Martes",
  MIERCOLES: "Miércoles",
  JUEVES: "Jueves",
  VIERNES: "Viernes",
  SABADO: "Sábado",
  DOMINGO: "Domingo",
};

export const MEAL_TYPE_LABEL: Record<string, string> = {
  DESAYUNO: "Desayuno",
  ALMUERZO: "Almuerzo",
  COMIDA: "Comida",
  COMIDA_LIBRE_SOCIAL: "Comida libre / social",
  CENA: "Cena",
};

const KCAL_PER_KG_FAT = 7700;

/**
 * Convierte una fecha-sin-hora (tal y como la devuelve Postgres para columnas `date`,
 * un instante a medianoche UTC) al día de la semana del dominio.
 */
export function dateToWeekday(date: Date): Weekday {
  // getUTCDay(): 0 = domingo ... 6 = sábado
  const jsDay = date.getUTCDay();
  const index = jsDay === 0 ? 6 : jsDay - 1;
  return WEEKDAY_ORDER[index];
}

/**
 * Clave YYYY-MM-DD de una fecha-sin-hora. Usa siempre los getters UTC para que
 * coincida con cómo se guardan y devuelven las columnas `date` de Postgres,
 * independientemente de la zona horaria del proceso.
 */
export function toDateKey(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function dateKeyToDate(dateKey: string): Date {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/**
 * "Hoy" como fecha-sin-hora, a partir del reloj/huso horario del servidor
 * (configura la variable de entorno TZ en el despliegue para que coincida
 * con la zona horaria de la usuaria).
 */
export function today(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

export function todayKey(): string {
  return toDateKey(today());
}

export function isSameDate(a: Date, b: Date): boolean {
  return toDateKey(a) === toDateKey(b);
}

export function addDays(date: Date, days: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days));
}

/** Lunes (fecha-sin-hora, UTC) de la semana ISO a la que pertenece `date`. */
export function getWeekStart(date: Date): Date {
  const weekday = dateToWeekday(date);
  const index = WEEKDAY_ORDER.indexOf(weekday);
  return addDays(date, -index);
}

/** kcal = MET * 3.5 * peso_kg / 200 * minutos */
export function calcExerciseKcal(met: number, pesoKg: number, minutos: number): number {
  return (met * 3.5 * pesoKg / 200) * minutos;
}

export type MacroTotals = {
  kcal: number;
  proteinaG: number;
  carbohidratosG: number;
  grasasG: number;
};

export function sumMacros(items: MacroTotals[]): MacroTotals {
  return items.reduce(
    (acc, item) => ({
      kcal: acc.kcal + item.kcal,
      proteinaG: acc.proteinaG + item.proteinaG,
      carbohidratosG: acc.carbohidratosG + item.carbohidratosG,
      grasasG: acc.grasasG + item.grasasG,
    }),
    { kcal: 0, proteinaG: 0, carbohidratosG: 0, grasasG: 0 },
  );
}

export type SemaphoreStatus = "VERDE" | "AMBAR" | "ROJO";

/**
 * Semáforo del día en función de la desviación de kcal ingeridas respecto al objetivo.
 * Igual que en el Excel original: dentro de objetivo, desviación leve o desviación alta.
 */
export function getSemaphoreStatus(kcalIngeridas: number, objetivoKcal: number): SemaphoreStatus {
  if (objetivoKcal <= 0) return "VERDE";
  const desviacion = Math.abs(kcalIngeridas - objetivoKcal) / objetivoKcal;
  if (desviacion <= 0.07) return "VERDE";
  if (desviacion <= 0.15) return "AMBAR";
  return "ROJO";
}

export type DailyBalance = {
  kcalIngeridas: number;
  kcalEjercicio: number;
  gastoTotal: number;
  deficitReal: number;
  objetivoKcal: number;
  semaforo: SemaphoreStatus;
};

/**
 * Gasto total del día = GET base del perfil + kcal quemadas por ejercicio.
 * Déficit real = gasto total - kcal ingeridas (positivo = déficit, negativo = superávit).
 */
export function computeDailyBalance(params: {
  kcalIngeridas: number;
  kcalEjercicio: number;
  getKcalBase: number;
  objetivoKcal: number;
}): DailyBalance {
  const gastoTotal = params.getKcalBase + params.kcalEjercicio;
  const deficitReal = gastoTotal - params.kcalIngeridas;
  return {
    kcalIngeridas: params.kcalIngeridas,
    kcalEjercicio: params.kcalEjercicio,
    gastoTotal,
    deficitReal,
    objetivoKcal: params.objetivoKcal,
    semaforo: getSemaphoreStatus(params.kcalIngeridas, params.objetivoKcal),
  };
}

export function estimateFatLossKg(deficitAcumuladoKcal: number): number {
  return deficitAcumuladoKcal / KCAL_PER_KG_FAT;
}

export function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}
