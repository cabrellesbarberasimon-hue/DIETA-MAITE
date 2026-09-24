import Link from "next/link";
import { listUsuarias } from "@/lib/data/usuaria";
import { OBJETIVOS_PRINCIPALES, addDays, today } from "@/lib/nutrition";
import { fmtDateShort, fmtNum } from "@/lib/format";

type WeightLog = { fecha: Date; pesoKg: number; grasaCorporalPct: number | null };

function objetivoLabel(value: string | null): string | null {
  if (!value) return null;
  return OBJETIVOS_PRINCIPALES.find((o) => o.value === value)?.label ?? null;
}

function tendencia(weightLogs: WeightLog[]): "subiendo" | "bajando" | "estable" | null {
  if (weightLogs.length < 2) return null;
  const last = weightLogs[weightLogs.length - 1];
  const twoWeeksAgo = addDays(today(), -14);
  const reference = weightLogs.find((w) => w.fecha.getTime() >= twoWeeksAgo.getTime()) ?? weightLogs[0];
  if (reference.fecha.getTime() === last.fecha.getTime()) return null;
  const diff = last.pesoKg - reference.pesoKg;
  if (diff > 0.3) return "subiendo";
  if (diff < -0.3) return "bajando";
  return "estable";
}

const TENDENCIA_ICON: Record<string, string> = { subiendo: "↑", bajando: "↓", estable: "→" };

export default async function AdminUsuariasPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const usuarias = await listUsuarias(q);

  return (
    <div className="mx-auto max-w-md space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-900">Personas</h1>
        <Link
          href="/admin/usuarias/nueva"
          className="rounded-xl bg-green-600 px-3 py-2 text-sm font-semibold text-white active:scale-[0.98]"
        >
          + Nueva
        </Link>
      </div>

      <form action="/admin" className="flex gap-2">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Buscar por nombre…"
          className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm"
        />
        {q && (
          <Link
            href="/admin"
            className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-medium text-slate-500"
          >
            Quitar
          </Link>
        )}
        <button type="submit" className="rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-medium text-white">
          Buscar
        </button>
      </form>

      <a
        href="/api/admin/backup"
        className="block rounded-xl border border-dashed border-slate-300 px-3 py-2 text-center text-xs font-medium text-slate-500"
      >
        ⬇ Descargar copia de seguridad completa (JSON)
      </a>

      {usuarias.length === 0 ? (
        <p className="rounded-2xl bg-slate-50 p-4 text-center text-sm text-slate-400">
          {q ? "No hay ninguna persona con ese nombre." : "Todavía no hay ninguna persona dada de alta."}
        </p>
      ) : (
        <ul className="space-y-2">
          {usuarias.map((usuaria) => {
            const logs = usuaria.weightLogs;
            const last = logs.at(-1) ?? null;
            const pesoActual = last?.pesoKg ?? usuaria.profile?.pesoInicialKg ?? null;
            const grasaActual = last?.grasaCorporalPct ?? null;
            const objetivo = objetivoLabel(usuaria.profile?.objetivoPrincipal ?? null);
            const trend = tendencia(logs);

            return (
              <li key={usuaria.id}>
                <Link
                  href={`/admin/usuarias/${usuaria.id}`}
                  className="block rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 active:bg-slate-50"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-slate-800">{usuaria.name}</p>
                    {trend && (
                      <span className="text-sm text-slate-400" title={trend}>
                        {TENDENCIA_ICON[trend]}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500">
                    {objetivo && <span>{objetivo}</span>}
                    {grasaActual != null && <span>{fmtNum(grasaActual, 1)}% grasa</span>}
                    {pesoActual != null && <span>{fmtNum(pesoActual, 1)} kg</span>}
                    {last && <span>último control {fmtDateShort(last.fecha)}</span>}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
