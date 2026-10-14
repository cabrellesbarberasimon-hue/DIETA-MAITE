import Link from "next/link";
import type { DaySummary } from "@/lib/data/week";
import { todayKey } from "@/lib/nutrition";

const SEMAFORO_CIRCLE: Record<string, string> = {
  VERDE: "bg-green-500 text-white",
  AMBAR: "bg-amber-500 text-white",
  ROJO: "bg-red-500 text-white",
};

/**
 * Tira horizontal con los 7 días de la semana actual, para saltar
 * directamente a cualquiera sin pasar por /historial. El día de hoy enlaza
 * al dashboard; el resto, a /historial/[date]. No se puede entrar a días
 * futuros (sin datos ni enlace).
 */
export function WeekStrip({ days, selectedDateKey }: { days: DaySummary[]; selectedDateKey: string }) {
  const today = todayKey();

  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
      {days.map((day) => {
        const isSelected = day.dateKey === selectedDateKey;
        const isFuture = day.dateKey > today;
        const href = day.dateKey === today ? "/dashboard" : `/historial/${day.dateKey}`;
        const content = (
          <div
            className={`flex w-12 shrink-0 flex-col items-center gap-1 rounded-xl py-2 text-xs font-medium ${
              isSelected ? "bg-slate-800 text-white" : isFuture ? "text-slate-300" : "text-slate-500"
            }`}
          >
            <span className="uppercase">{day.weekdayLabel.slice(0, 3)}</span>
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-sm ${
                day.hasData && day.semaforo
                  ? SEMAFORO_CIRCLE[day.semaforo]
                  : isSelected
                    ? "bg-white/20"
                    : ""
              }`}
            >
              {day.fecha.getUTCDate()}
            </span>
          </div>
        );
        return isFuture ? (
          <div key={day.dateKey}>{content}</div>
        ) : (
          <Link key={day.dateKey} href={href}>
            {content}
          </Link>
        );
      })}
    </div>
  );
}
