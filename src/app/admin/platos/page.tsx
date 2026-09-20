import { requireAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { normalizeSearchText } from "@/lib/text";
import { PlatosManager } from "./PlatosManager";

export default async function AdminPlatosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireAdmin();
  const { q } = await searchParams;

  const [platos, total] = await Promise.all([
    prisma.mealTemplate.findMany({
      where: q ? { busqueda: { contains: normalizeSearchText(q) } } : undefined,
      orderBy: { updatedAt: "desc" },
      take: 50,
    }),
    prisma.mealTemplate.count(),
  ]);

  return (
    <div className="mx-auto max-w-md space-y-5">
      <div>
        <h1 className="text-lg font-bold text-slate-900">Biblioteca de platos</h1>
        <p className="text-xs text-slate-400">
          {total} platos en total, compartidos por todas las personas. Se guardan aquí al crear una opción de
          comida (o importar un Excel) marcando la casilla de guardar en la biblioteca.
        </p>
      </div>

      <form className="flex gap-2" action="/admin/platos">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Buscar por descripción…"
          className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm"
        />
        <button type="submit" className="rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-medium text-white">
          Buscar
        </button>
      </form>

      <PlatosManager platos={platos} query={q ?? ""} showingLimited={!q && total > platos.length} />
    </div>
  );
}
