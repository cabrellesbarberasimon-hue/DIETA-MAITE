import { fmtDateShort } from "@/lib/format";

type Point = { fecha: Date; pesoKg: number };

export function WeightChart({
  points,
  pesoObjetivoKg,
}: {
  points: Point[];
  pesoObjetivoKg: number | null;
}) {
  if (points.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-slate-400">
        Todavía no hay registros de peso.
      </div>
    );
  }

  const width = 600;
  const height = 220;
  const padX = 28;
  const padY = 24;

  const values = points.map((p) => p.pesoKg).concat(pesoObjetivoKg ?? []);
  const min = Math.min(...values) - 0.5;
  const max = Math.max(...values) + 0.5;

  const xFor = (i: number) =>
    points.length === 1
      ? width / 2
      : padX + (i / (points.length - 1)) * (width - padX * 2);
  const yFor = (v: number) => height - padY - ((v - min) / (max - min)) * (height - padY * 2);

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${xFor(i)} ${yFor(p.pesoKg)}`).join(" ");
  const targetY = pesoObjetivoKg != null ? yFor(pesoObjetivoKg) : null;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Evolución del peso">
      {targetY != null && (
        <>
          <line
            x1={padX}
            y1={targetY}
            x2={width - padX}
            y2={targetY}
            stroke="#16a34a"
            strokeDasharray="4 4"
            strokeWidth={1.5}
          />
          <text x={width - padX} y={targetY - 6} textAnchor="end" className="fill-green-700 text-[10px]">
            objetivo {pesoObjetivoKg} kg
          </text>
        </>
      )}

      <path d={linePath} fill="none" stroke="#0f766e" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />

      {points.map((p, i) => (
        <circle key={i} cx={xFor(i)} cy={yFor(p.pesoKg)} r={3.5} fill="#0f766e" />
      ))}

      <text x={padX} y={height - 4} className="fill-slate-400 text-[10px]">
        {fmtDateShort(points[0].fecha)}
      </text>
      <text x={width - padX} y={height - 4} textAnchor="end" className="fill-slate-400 text-[10px]">
        {fmtDateShort(points[points.length - 1].fecha)}
      </text>
    </svg>
  );
}
