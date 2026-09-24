import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { todayKey, dateKeyToDate } from "@/lib/nutrition";
import { sendPushNotification, pushIsConfigured } from "@/lib/push";

/**
 * Recordatorio diario: avisa por push a las usuarias que tienen suscripción
 * activa y todavía no han registrado ninguna comida hoy. Pensado para
 * llamarse una vez al día desde Vercel Cron (ver vercel.json), protegido por
 * CRON_SECRET en el header Authorization.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!pushIsConfigured()) {
    return NextResponse.json({ skipped: "VAPID no configurado" });
  }

  const fecha = dateKeyToDate(todayKey());

  const usuariasConSuscripcion = await prisma.user.findMany({
    where: { role: "USUARIA", pushSubscriptions: { some: {} } },
    select: {
      id: true,
      pushSubscriptions: true,
      mealLogs: { where: { fecha }, select: { id: true }, take: 1 },
    },
  });

  let enviados = 0;
  let expirados = 0;

  for (const usuaria of usuariasConSuscripcion) {
    if (usuaria.mealLogs.length > 0) continue;

    for (const sub of usuaria.pushSubscriptions) {
      const result = await sendPushNotification(sub, {
        title: "NutriProgress",
        body: "Todavía no has registrado ninguna comida hoy. ¡No olvides anotarlas!",
        url: "/dashboard",
      });
      if (result.ok) {
        enviados++;
      } else if (result.expired) {
        expirados++;
        await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
      }
    }
  }

  return NextResponse.json({ enviados, expirados, revisadas: usuariasConSuscripcion.length });
}
