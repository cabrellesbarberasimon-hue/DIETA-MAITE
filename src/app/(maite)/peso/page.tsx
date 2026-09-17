import { requireUsuaria } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { WeightChart } from "@/components/WeightChart";
import { WeightForm } from "@/components/WeightForm";
import { fmtDateShort, fmtNum } from "@/lib/format";

export default async function PesoPage() {
  const session = await requireUsuaria();

  const [profile, weightLogs] = await Promise.all([
    prisma.profile.findUnique({ where: { userId: session.sub } }),
    prisma.weightLog.findMany({
      where: { userId: session.sub },
      orderBy: { fecha: "asc" },
    }),
  ]);

  if (!profile) {
    return <p className="text-sm text-red-600">No hay perfil configurado todavía.</p>;
  }

  const last = weightLogs.at(-1) ?? null;
  const pesoActual = last?.pesoKg ?? profile.pesoInicialKg;
  const kgPendientes = pesoActual - profile.pesoObjetivoKg;

  return (
    <div className="mx-auto max-w-md space-y-5">
      <h1 className="text-lg font-bold text-slate-900">Peso</h1>

      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div className="mb-4 grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-xs text-slate-500">Actual</p>
            <p className="text-xl font-bold text-slate-900">{fmtNum(pesoActual, 1)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Objetivo</p>
            <p className="text-xl font-bold text-slate-900">{fmtNum(profile.pesoObjetivoKg, 1)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Pendiente</p>
            <p className="text-xl font-bold text-green-700">
              {kgPendientes > 0 ? fmtNum(kgPendientes, 1) : "0"} kg
            </p>
          </div>
        </div>

        <WeightForm lastWeightKg={last?.pesoKg ?? null} />
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="mb-3 text-sm font-semibold text-slate-500">Evolución</h2>
        <WeightChart points={weightLogs} pesoObjetivoKg={profile.pesoObjetivoKg} />
      </section>

      {weightLogs.length > 0 && (
        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h2 className="mb-3 text-sm font-semibold text-slate-500">Registros</h2>
          <ul className="divide-y divide-slate-100">
            {weightLogs
              .slice()
              .reverse()
              .map((w) => (
                <li key={w.id} className="flex justify-between py-2 text-sm">
                  <span className="text-slate-500">{fmtDateShort(w.fecha)}</span>
                  <span className="font-medium text-slate-800">{fmtNum(w.pesoKg, 1)} kg</span>
                </li>
              ))}
          </ul>
        </section>
      )}
    </div>
  );
}
