import "server-only";
import { getDayData } from "@/lib/data/day";
import { fmtDateShort } from "@/lib/format";
import { addDays, toDateKey, today as todayDate, MEAL_TYPE_LABEL, WEEKDAY_LABEL, WEEKDAY_ORDER } from "@/lib/nutrition";

/**
 * Informe semanal en texto plano con lo que ha comido la usuaria día a día
 * (comidas, kcal y macros), pensado para copiar y pegar en un chat de IA
 * (p.ej. para pedir consejo) o guardarlo como texto. No incluye nada más
 * que los datos de comida de esa semana.
 */
export async function buildWeekReportText(userId: string, userName: string, weekStart: Date): Promise<string> {
  const today = todayDate();
  const lines: string[] = [];
  lines.push(`Informe semanal de comidas — ${userName}`);
  lines.push(`Semana del ${fmtDateShort(weekStart)} al ${fmtDateShort(addDays(weekStart, 6))}`);
  lines.push("");

  for (let i = 0; i < 7; i++) {
    const fecha = addDays(weekStart, i);
    if (fecha.getTime() > today.getTime()) continue;
    const dateKey = toDateKey(fecha);
    const weekdayLabel = WEEKDAY_LABEL[WEEKDAY_ORDER[i]];

    let day;
    try {
      day = await getDayData(userId, dateKey);
    } catch {
      continue;
    }

    lines.push(`${weekdayLabel} ${fmtDateShort(fecha)}`);
    if (day.mealLogs.length === 0) {
      lines.push("  (sin registros)");
    } else {
      for (const log of day.mealLogs) {
        lines.push(
          `  - ${MEAL_TYPE_LABEL[log.mealType] ?? log.mealType}: ${log.nombre} ` +
            `(${Math.round(log.kcal)} kcal, P${Math.round(log.proteinaG)} C${Math.round(log.carbohidratosG)} G${Math.round(log.grasasG)})`,
        );
      }
      lines.push(
        `  Total día: ${Math.round(day.macrosIngeridos.kcal)} kcal (objetivo ${Math.round(day.objetivos.kcal)} kcal)`,
      );
    }
    lines.push("");
  }

  return lines.join("\n").trimEnd() + "\n";
}
