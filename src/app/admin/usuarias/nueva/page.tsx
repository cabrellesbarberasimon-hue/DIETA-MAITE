import Link from "next/link";
import { NuevaUsuariaForm } from "./NuevaUsuariaForm";

export default function NuevaUsuariaPage() {
  return (
    <div className="mx-auto max-w-md space-y-4">
      <Link href="/admin" className="text-sm font-medium text-slate-500 active:text-slate-700">
        ← Volver a personas
      </Link>
      <h1 className="text-lg font-bold text-slate-900">Nueva persona</h1>
      <NuevaUsuariaForm />
    </div>
  );
}
