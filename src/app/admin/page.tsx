import Link from "next/link";
import { listUsuarias } from "@/lib/data/usuaria";

export default async function AdminUsuariasPage() {
  const usuarias = await listUsuarias();

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

      {usuarias.length === 0 ? (
        <p className="rounded-2xl bg-slate-50 p-4 text-center text-sm text-slate-400">
          Todavía no hay ninguna persona dada de alta.
        </p>
      ) : (
        <ul className="space-y-2">
          {usuarias.map((usuaria) => (
            <li key={usuaria.id}>
              <Link
                href={`/admin/usuarias/${usuaria.id}`}
                className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 active:bg-slate-50"
              >
                <div>
                  <p className="font-semibold text-slate-800">{usuaria.name}</p>
                  <p className="text-xs text-slate-400">{usuaria.email}</p>
                </div>
                {usuaria.profile && (
                  <p className="text-xs text-slate-500">
                    objetivo {usuaria.profile.pesoObjetivoKg} kg
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
