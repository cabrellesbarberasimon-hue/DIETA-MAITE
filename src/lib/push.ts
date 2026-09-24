import "server-only";
import webpush from "web-push";

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;

let configured = false;

function ensureConfigured() {
  if (configured) return;
  if (!publicKey || !privateKey) {
    throw new Error("Faltan las variables VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY para enviar notificaciones push.");
  }
  webpush.setVapidDetails("mailto:soporte@nutriprogress.app", publicKey, privateKey);
  configured = true;
}

export function pushIsConfigured() {
  return Boolean(publicKey && privateKey);
}

export type PushSubscriptionKeys = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

/** Envía una notificación push; devuelve false (y no lanza) si la suscripción ya no es válida. */
export async function sendPushNotification(
  sub: PushSubscriptionKeys,
  payload: { title: string; body: string; url?: string },
): Promise<{ ok: true } | { ok: false; expired: boolean }> {
  ensureConfigured();
  try {
    await webpush.sendNotification(
      {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      },
      JSON.stringify(payload),
    );
    return { ok: true };
  } catch (err) {
    const statusCode = (err as { statusCode?: number }).statusCode;
    const expired = statusCode === 404 || statusCode === 410;
    return { ok: false, expired };
  }
}
