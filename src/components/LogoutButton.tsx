"use client";

import { useState } from "react";
import { clearSessionAction } from "@/app/login/actions";

export function LogoutButton() {
  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        setPending(true);
        clearSessionAction().finally(() => {
          // Recarga completa a propósito (no router.push/redirect): garantiza
          // que no queda ningún resto de la sesión anterior en memoria/DOM si
          // otra persona usa el mismo dispositivo a continuación.
          // eslint-disable-next-line @next/next/no-location-assign-relative-destination
          window.location.href = "/login";
        });
      }}
      className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-500 active:bg-slate-100 disabled:opacity-60"
    >
      Salir
    </button>
  );
}
