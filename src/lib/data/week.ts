import "server-only";
import { getDayData } from "@/lib/data/day";
import {
  addDays,
  average,
  estimateFatLossKg,
  toDateKey,
  today as todayDate,
  WEEKDAY_LABEL,
  WEEKDAY_ORDER,
  type SemaphoreStatus,
} from "@/lib/nutrition";

export type DaySummary = {
  dateKey: string;
  fecha: Date;
  weekdayLabel: string;
  hasData: boolean;
  kcalIngeridas: number;
  objetivoKcal: number;
  deficitReal: number;
  semaforo: SemaphoreStatus | null;
};

export type WeekSummary = {
  weekStart: Date;
  weekEnd: Date;
  days: DaySummary[];
  avgKcal: number;
  avgProteinaG: number;
  avgCarbohidratosG: number;
  avgGrasasG: number;
  deficitAcumulado: number;
  fatLossKg: number;
};

export async function getWeekSummary(userId: string, weekStart: Date): Promise<WeekSummary> {
  const today = todayDate();
  const days: DaySummary[] = [];

  const kcalValues: number[] = [];
  const proteinaValues: number[] = [];
  const carbValues: number[] = [];
  const grasaValues: number[] = [];
  let deficitAcumulado = 0;

  for (let i = 0; i < 7; i++) {
    const fecha = addDays(weekStart, i);
    const dateKey = toDateKey(fecha);
    const hasData = fecha.getTime() <= today.getTime();

    if (!hasData) {
      days.push({
        dateKey,
        fecha,
        weekdayLabel: WEEKDAY_LABEL[WEEKDAY_ORDER[i]],
        hasData: false,
        kcalIngeridas: 0,
        objetivoKcal: 0,
        deficitReal: 0,
        semaforo: null,
      });
      continue;
    }

    const day = await getDayData(userId, dateKey);
    days.push({
      dateKey,
      fecha,
      weekdayLabel: WEEKDAY_LABEL[WEEKDAY_ORDER[i]],
      hasData: true,
      kcalIngeridas: day.macrosIngeridos.kcal,
      objetivoKcal: day.objetivos.kcal,
      deficitReal: day.balance.deficitReal,
      semaforo: day.balance.semaforo,
    });

    kcalValues.push(day.macrosIngeridos.kcal);
    proteinaValues.push(day.macrosIngeridos.proteinaG);
    carbValues.push(day.macrosIngeridos.carbohidratosG);
    grasaValues.push(day.macrosIngeridos.grasasG);
    deficitAcumulado += day.balance.deficitReal;
  }

  return {
    weekStart,
    weekEnd: addDays(weekStart, 6),
    days,
    avgKcal: average(kcalValues),
    avgProteinaG: average(proteinaValues),
    avgCarbohidratosG: average(carbValues),
    avgGrasasG: average(grasaValues),
    deficitAcumulado,
    fatLossKg: estimateFatLossKg(deficitAcumulado),
  };
}
