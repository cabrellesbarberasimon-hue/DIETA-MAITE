export function CalculoAutomatico({
  bmrKcal,
  factorActividad,
  getKcal,
  presupuestoSemanalKcal,
  esManual,
}: {
  bmrKcal: number;
  factorActividad: number;
  getKcal: number;
  presupuestoSemanalKcal: number;
  esManual?: boolean;
}) {
  return (
    <div className="space-y-1 rounded-xl bg-slate-50 p-3 text-sm">
      <p className="text-slate-700">
        BMR estimado: <strong>{Math.round(bmrKcal)} kcal</strong>
      </p>
      <p className="text-slate-700">
        GET estimado: <strong>{Math.round(getKcal)} kcal</strong>
      </p>
      <p className="text-xs text-slate-400">BMR × factor de actividad ({factorActividad})</p>
      <p className="text-slate-700">
        Presupuesto semanal: <strong>{Math.round(presupuestoSemanalKcal)} kcal</strong>
      </p>
      {esManual && (
        <p className="text-xs font-medium text-amber-600">
          Valor guardado a mano — no se recalcula solo. Usa &quot;Recalcular&quot; para pasarlo a automático.
        </p>
      )}
    </div>
  );
}
