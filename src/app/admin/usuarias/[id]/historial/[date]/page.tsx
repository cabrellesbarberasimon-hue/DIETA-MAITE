import Link from "next/link";
import { getUsuariaById } from "@/lib/data/usuaria";
import { getDayData } from "@/lib/data/day";
import { DayDetail } from "@/components/DayDetail";

export default async function AdminUsuariaHistorialDiaPage({
  params,
}: {
  params: Promise<{ id: string; date: string }>;
}) {
  const { id, date } = await params;
  const usuaria = await getUsuariaById(id);
  const day = await getDayData(usuaria.id, date);

  return (
    <div className="mx-auto max-w-md space-y-4">
      <Link
        href={`/admin/usuarias/${usuaria.id}/historial`}
        className="text-sm font-medium text-slate-500 active:text-slate-700"
      >
        ← Volver al historial
      </Link>
      <DayDetail day={day} />
    </div>
  );
}
