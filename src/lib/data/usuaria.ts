import "server-only";
import { prisma } from "@/lib/prisma";

export function listUsuarias() {
  return prisma.user.findMany({
    where: { role: "USUARIA" },
    orderBy: { createdAt: "asc" },
    include: { profile: true },
  });
}

export async function getUsuariaById(userId: string) {
  const usuaria = await prisma.user.findUnique({ where: { id: userId } });
  if (!usuaria || usuaria.role !== "USUARIA") {
    throw new Error("Usuaria no encontrada.");
  }
  return usuaria;
}
