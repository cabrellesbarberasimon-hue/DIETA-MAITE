import type { DailyScore } from "@/lib/nutrition";

const ITEMS: { key: keyof DailyScore["breakdown"]; label: string }[] = [
  { key: "kcal", label: "Calorías dentro de objetivo" },
  { key: "proteina", label: "Proteína" },
  { key: "pasos", label: "Pasos" },
  { key: "agua", label: "Agua" },
  { key: "macros", label: "Carbohidratos y grasas" },
];

function colorFor(total: number): { text: string; ring: string } {
  if (total >= 80) return { text: "text-green-700", ring: "ring-green-200 bg-green-50" };
  if (total >= 50) return { text: "text-amber-700", ring: "ring-amber-200 bg-amber-50" };
  return { text: "text-red-600", ring: "ring-red-200 bg-red-50" };
}

/**
 * Puntuación del día (0-100): combina calorías dentro de objetivo, proteína,
 * pasos, agua y macros. Es una guía motivacional para la usuaria, no un dato
 * médico — el detalle de qué puntúa qué está en computeDailyScore.
 */
export function DailyScoreCard({ score }: { score: DailyScore }) {
  const { text, ring } = colorFor(score.total);

  return (
    <section className={`rounded-2xl p-5 shadow-sm ring-1 ${ring}`}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-500">Puntuación del día</h2>
        <span className={`text-2xl font-bold ${text}`}>{score.total}/100</span>
      </div>
      <div className="space-y-2">
        {ITEMS.map(({ key, label }) => {
          const { pts, max } = score.breakdown[key];
          const pct = max > 0 ? Math.round((pts / max) * 100) : 0;
          return (
            <div key={key}>
              <div className="mb-0.5 flex items-baseline justify-between text-xs">
                <span className="text-slate-600">{label}</span>
                <span className="text-slate-400">
                  {pts}/{max}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/70">
                <div
                  className={`h-full rounded-full ${pct >= 100 ? "bg-green-500" : pct > 0 ? "bg-amber-500" : "bg-slate-300"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
