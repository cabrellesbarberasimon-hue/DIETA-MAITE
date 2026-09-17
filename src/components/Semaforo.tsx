import type { SemaphoreStatus } from "@/lib/nutrition";

const STYLES: Record<SemaphoreStatus, { bg: string; text: string; label: string; dot: string }> = {
  VERDE: { bg: "bg-green-100", text: "text-green-800", dot: "bg-green-500", label: "Dentro de objetivo" },
  AMBAR: { bg: "bg-amber-100", text: "text-amber-800", dot: "bg-amber-500", label: "Desviación leve" },
  ROJO: { bg: "bg-red-100", text: "text-red-800", dot: "bg-red-500", label: "Desviación alta" },
};

export function Semaforo({ status, className = "" }: { status: SemaphoreStatus; className?: string }) {
  const s = STYLES[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${s.bg} ${s.text} ${className}`}
    >
      <span className={`h-2 w-2 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}
