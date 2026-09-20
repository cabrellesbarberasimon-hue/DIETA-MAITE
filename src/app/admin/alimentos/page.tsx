import { requireAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { normalizeSearchText } from "@/lib/text";
import { AlimentosManager } from "./AlimentosManager";

export default async function AdminAlimentosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireAdmin();
  const { q } = await searchParams;

  const [foods, total] = await Promise.all([
    prisma.food.findMany({
      where: q ? { busqueda: { contains: normalizeSearchText(q) } } : undefined,
      orderBy: { nombre: "asc" },
      take: 50,
    }),
    prisma.food.count(),
  ]);

  return (
    <div className="mx-auto max-w-md space-y-5">
      <div>
        <h1 className="text-lg font-bold text-slate-900">Biblioteca de alimentos</h1>
        <p className="text-xs text-slate-400">{total} alimentos en total, compartidos por todas las personas.</p>
      </div>

      <form className="flex gap-2" action="/admin/alimentos">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Buscar por nombre…"
          className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm"
        />
        <button type="submit" className="rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-medium text-white">
          Buscar
        </button>
      </form>

      <AlimentosManager foods={foods} query={q ?? ""} showingLimited={!q && total > foods.length} />
    </div>
  );
}
