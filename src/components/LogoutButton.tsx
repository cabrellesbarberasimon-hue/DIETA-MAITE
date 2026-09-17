"use client";

import { logoutAction } from "@/app/login/actions";

export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-500 active:bg-slate-100"
      >
        Salir
      </button>
    </form>
  );
}
