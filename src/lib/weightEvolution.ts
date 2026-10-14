export type WeightPoint = {
  fecha: Date;
  pesoKg: number;
  grasaCorporalPct: number | null;
  masaMuscularKg: number | null;
};

export type MonthlyEvolution = {
  monthKey: string;
  label: string;
  pesoInicio: number;
  pesoFin: number;
  deltaPesoKg: number;
  grasaInicio: number | null;
  grasaFin: number | null;
  deltaGrasaPct: number | null;
  numRegistros: number;
};

function monthLabel(date: Date): string {
  const label = date.toLocaleDateString("es-ES", { timeZone: "UTC", month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/**
 * Agrupa los registros de peso por mes (primero/último de cada mes), para
 * ver de un vistazo la evolución física mes a mes: cuánto peso/grasa ha
 * ganado o perdido. Los puntos vienen ya ordenados por fecha ascendente;
 * el resultado va del mes más reciente al más antiguo.
 */
export function getMonthlyEvolution(points: WeightPoint[]): MonthlyEvolution[] {
  const byMonth = new Map<string, WeightPoint[]>();
  for (const point of points) {
    const key = `${point.fecha.getUTCFullYear()}-${String(point.fecha.getUTCMonth() + 1).padStart(2, "0")}`;
    const bucket = byMonth.get(key);
    if (bucket) bucket.push(point);
    else byMonth.set(key, [point]);
  }

  return Array.from(byMonth.entries())
    .map(([monthKey, bucket]): MonthlyEvolution => {
      const first = bucket[0];
      const last = bucket.at(-1)!;
      const grasaInicio = first.grasaCorporalPct;
      const grasaFin = last.grasaCorporalPct;
      return {
        monthKey,
        label: monthLabel(first.fecha),
        pesoInicio: first.pesoKg,
        pesoFin: last.pesoKg,
        deltaPesoKg: last.pesoKg - first.pesoKg,
        grasaInicio,
        grasaFin,
        deltaGrasaPct: grasaInicio != null && grasaFin != null ? grasaFin - grasaInicio : null,
        numRegistros: bucket.length,
      };
    })
    .sort((a, b) => b.monthKey.localeCompare(a.monthKey));
}
