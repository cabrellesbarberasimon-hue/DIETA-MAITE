"use client";

import { useEffect, useState } from "react";
import { subscribeToPushAction, unsubscribeFromPushAction } from "@/lib/actions/push";

type Status = "loading" | "unsupported" | "off" | "on" | "denied";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function PushReminderToggle({ vapidPublicKey }: { vapidPublicKey: string | null }) {
  const [status, setStatus] = useState<Status>("loading");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    // La detección de soporte/permiso solo puede hacerse en el navegador, y
    // el estado inicial ("loading") ya coincide con el render del servidor,
    // así que fijarla aquí de forma síncrona no causa un desajuste de
    // hidratación (a diferencia de calcularla directamente en el render).
    if (!vapidPublicKey || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatus("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setStatus("denied");
      return;
    }
    navigator.serviceWorker.register("/sw.js").then(async (registration) => {
      const existing = await registration.pushManager.getSubscription();
      setStatus(existing ? "on" : "off");
    });
  }, [vapidPublicKey]);

  async function activar() {
    if (!vapidPublicKey) return;
    setPending(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("denied");
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
      const json = sub.toJSON();
      await subscribeToPushAction({
        endpoint: json.endpoint!,
        p256dh: json.keys!.p256dh,
        auth: json.keys!.auth,
      });
      setStatus("on");
    } finally {
      setPending(false);
    }
  }

  async function desactivar() {
    setPending(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.getSubscription();
      if (sub) {
        await unsubscribeFromPushAction(sub.endpoint);
        await sub.unsubscribe();
      }
      setStatus("off");
    } finally {
      setPending(false);
    }
  }

  if (status === "unsupported" || status === "loading") return null;

  if (status === "denied") {
    return (
      <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700 ring-1 ring-amber-200">
        Bloqueaste las notificaciones para esta app. Actívalas desde los ajustes del navegador si quieres recibir
        recordatorios.
      </p>
    );
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={status === "on" ? desactivar : activar}
      className="w-full rounded-xl border border-dashed border-slate-300 px-3 py-2 text-center text-xs font-medium text-slate-500 disabled:opacity-60"
    >
      {status === "on" ? "🔔 Recordatorios activados — desactivar" : "🔕 Activar recordatorio diario"}
    </button>
  );
}
