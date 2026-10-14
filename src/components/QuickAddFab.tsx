"use client";

import { useState } from "react";
import { addFreeMealLogAction } from "@/lib/actions/logs";
import { FreeMealForm, type RecentFood } from "@/components/FreeMealForm";

function defaultMealTypeForHour(): string {
  const hour = new Date().getHours();
  if (hour < 11) return "DESAYUNO";
  if (hour < 14) return "ALMUERZO";
  if (hour < 18) return "COMIDA";
  return "CENA";
}

/**
 * Botón "+" fijo para registrar cualquier alimento en cualquier comida sin
 * tener que localizar primero su tarjeta (desayuno/comida/cena...). Se
 * muestra tanto en el dashboard de hoy como en el historial de un día
 * pasado, así que recibe la fecha a la que debe registrar.
 */
export function QuickAddFab({ dateKey, aiPhotoEnabled, recentFoods }: {
  dateKey: string;
  aiPhotoEnabled?: boolean;
  recentFoods?: RecentFood[];
}) {
  const [open, setOpen] = useState(false);
  const [mealType, setMealType] = useState(defaultMealTypeForHour());
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <button
        type="button"
        aria-label="Registrar alimento"
        onClick={() => {
          setMealType(defaultMealTypeForHour());
          setError(null);
          setOpen(true);
        }}
        className="fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-20 mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-600 text-3xl font-light text-white shadow-lg active:scale-95"
        style={{ left: "50%", transform: "translateX(-50%)" }}
      >
        +
      </button>

      {open && (
        <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40" onClick={() => setOpen(false)}>
          <div
            className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-800">Registrar alimento</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg px-2 py-1 text-sm text-slate-400 active:bg-slate-100"
              >
                Cerrar
              </button>
            </div>

            {error && <p className="mb-2 text-xs text-red-600">{error}</p>}

            <FreeMealForm
              mealType={mealType}
              onMealTypeChange={setMealType}
              pending={pending}
              aiPhotoEnabled={aiPhotoEnabled}
              recentFoods={recentFoods}
              submitLabel="Registrar"
              onSubmit={async (values) => {
                setError(null);
                setPending(true);
                try {
                  await addFreeMealLogAction({ mealType, ...values, fecha: dateKey });
                  setOpen(false);
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Ha ocurrido un error");
                } finally {
                  setPending(false);
                }
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}
