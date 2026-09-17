import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * La app tiene una única usuaria (Maite) que registra comidas y ejercicio;
 * el admin (Simón) solo supervisa. Este helper la resuelve para las pantallas
 * de admin, que necesitan su histórico sin tener su propia sesión.
 */
export async function getPrimaryUsuaria() {
  const usuaria = await prisma.user.findFirst({
    where: { role: "USUARIA" },
    orderBy: { createdAt: "asc" },
  });
  if (!usuaria) throw new Error("No hay ninguna usuaria dada de alta todavía.");
  return usuaria;
}
