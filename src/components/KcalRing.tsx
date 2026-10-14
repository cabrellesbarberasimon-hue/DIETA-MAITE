import type { SemaphoreStatus } from "@/lib/nutrition";

const RING_COLOR: Record<SemaphoreStatus, { track: string; fill: string }> = {
  VERDE: { track: "stroke-green-100", fill: "stroke-green-500" },
  AMBAR: { track: "stroke-amber-100", fill: "stroke-amber-500" },
  ROJO: { track: "stroke-red-100", fill: "stroke-red-500" },
};

const RADIO = 54;
const CIRCUNFERENCIA = 2 * Math.PI * RADIO;

/** Anillo de progreso de kcal ingeridas frente al objetivo del día, coloreado según el semáforo. */
export function KcalRing({
  ingerido,
  objetivo,
  status,
}: {
  ingerido: number;
  objetivo: number;
  status: SemaphoreStatus;
}) {
  const pct = objetivo > 0 ? Math.min(100, (ingerido / objetivo) * 100) : 0;
  const offset = CIRCUNFERENCIA - (pct / 100) * CIRCUNFERENCIA;
  const colors = RING_COLOR[status];

  return (
    <div className="relative mx-auto h-36 w-36">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={RADIO} strokeWidth="10" fill="none" className={colors.track} />
        <circle
          cx="60"
          cy="60"
          r={RADIO}
          strokeWidth="10"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={CIRCUNFERENCIA}
          strokeDashoffset={offset}
          className={colors.fill}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-slate-900">{Math.round(ingerido)}</span>
        <span className="text-xs text-slate-400">de {Math.round(objetivo)} kcal</span>
      </div>
    </div>
  );
}
