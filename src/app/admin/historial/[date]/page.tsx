import Link from "next/link";
import { getPrimaryUsuaria } from "@/lib/data/usuaria";
import { getDayData } from "@/lib/data/day";
import { DayDetail } from "@/components/DayDetail";

export default async function AdminHistorialDiaPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const usuaria = await getPrimaryUsuaria();
  const { date } = await params;
  const day = await getDayData(usuaria.id, date);

  return (
    <div className="mx-auto max-w-md space-y-4">
      <Link href="/admin/historial" className="text-sm font-medium text-slate-500 active:text-slate-700">
        ← Volver al historial
      </Link>
      <DayDetail day={day} />
    </div>
  );
}
