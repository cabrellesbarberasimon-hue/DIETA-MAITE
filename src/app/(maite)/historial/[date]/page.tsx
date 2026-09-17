import Link from "next/link";
import { requireUsuaria } from "@/lib/auth/guards";
import { getDayData } from "@/lib/data/day";
import { DayDetail } from "@/components/DayDetail";

export default async function HistorialDiaPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const session = await requireUsuaria();
  const { date } = await params;
  const day = await getDayData(session.sub, date);

  return (
    <div className="mx-auto max-w-md space-y-4">
      <Link href="/historial" className="text-sm font-medium text-slate-500 active:text-slate-700">
        ← Volver al historial
      </Link>
      <DayDetail day={day} />
    </div>
  );
}
