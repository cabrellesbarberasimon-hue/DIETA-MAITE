"use client";

import { useState } from "react";
import { setDayTypeAction } from "@/lib/actions/logs";

type DayType = { id: string; nombre: string; carbohidratosG: number };

export function DayTypeSelector({
  dateKey,
  dayTypes,
  selectedId,
}: {
  dateKey: string;
  dayTypes: DayType[];
  selectedId: string;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <select
        defaultValue={selectedId}
        disabled={pending}
        onChange={(e) => {
          setError(null);
          setPending(true);
          setDayTypeAction({ fecha: dateKey, dayTypeId: e.target.value })
            .catch((err) => setError(err instanceof Error ? err.message : "Error"))
            .finally(() => setPending(false));
        }}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700"
      >
        {dayTypes.map((dt) => (
          <option key={dt.id} value={dt.id}>
            {dt.nombre} ({dt.carbohidratosG} g carb.)
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
