"use client";

import { useState } from "react";
import { addWaterLogAction, deleteWaterLogAction } from "@/lib/actions/logs";

type WaterLog = { id: string; ml: number };

const QUICK_AMOUNTS = [100, 250, 500];

export function WaterPanel({ logs, dateKey }: { logs: WaterLog[]; dateKey?: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [custom, setCustom] = useState("");

  async function run(fn: () => Promise<void>) {
    setError(null);
    setPending(true);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ha ocurrido un error");
    } finally {
      setPending(false);
    }
  }

  function add(ml: number) {
    if (ml <= 0) return;
    run(() => addWaterLogAction({ ml, fecha: dateKey }));
  }

  return (
    <div>
      {logs.length > 0 && (
        <ul className="mb-3 space-y-1.5">
          {logs.map((log) => (
            <li
              key={log.id}
              className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-1.5 text-sm"
            >
              <span className="text-slate-700">💧 {log.ml} ml</span>
              <button
                type="button"
                disabled={pending}
                className="rounded-lg px-2 py-1 text-xs font-medium text-red-600 active:bg-red-100"
                onClick={() => run(() => deleteWaterLogAction({ id: log.id }))}
              >
                Borrar
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="mb-2 text-xs text-red-600">{error}</p>}

      <div className="flex flex-wrap items-center gap-2">
        {QUICK_AMOUNTS.map((ml) => (
          <button
            key={ml}
            type="button"
            disabled={pending}
            onClick={() => add(ml)}
            className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-medium text-sky-700 active:scale-[0.98] disabled:opacity-60"
          >
            +{ml} ml
          </button>
        ))}
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={5000}
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="ml"
            className="w-20 rounded-lg border border-slate-300 px-2 py-2 text-sm"
          />
          <button
            type="button"
            disabled={pending || !custom}
            onClick={() => {
              add(Number(custom) || 0);
              setCustom("");
            }}
            className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}
