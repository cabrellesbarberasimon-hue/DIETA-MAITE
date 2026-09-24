"use server";

import { z } from "zod";
import { requireUsuaria } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  p256dh: z.string().min(1),
  auth: z.string().min(1),
});

export async function subscribeToPushAction(input: z.infer<typeof subscribeSchema>) {
  const session = await requireUsuaria();
  const { endpoint, p256dh, auth } = subscribeSchema.parse(input);

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    update: { userId: session.sub, p256dh, auth },
    create: { userId: session.sub, endpoint, p256dh, auth },
  });
}

export async function unsubscribeFromPushAction(endpoint: string) {
  const session = await requireUsuaria();
  await prisma.pushSubscription.deleteMany({ where: { endpoint, userId: session.sub } });
}
