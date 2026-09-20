import "server-only";
import { prisma } from "@/lib/prisma";

export function listUsuarias(query?: string) {
  return prisma.user.findMany({
    where: {
      role: "USUARIA",
      ...(query ? { name: { contains: query, mode: "insensitive" } } : {}),
    },
    orderBy: { createdAt: "asc" },
    include: {
      profile: true,
      weightLogs: { orderBy: { fecha: "asc" } },
    },
  });
}

export async function getUsuariaById(userId: string) {
  const usuaria = await prisma.user.findUnique({ where: { id: userId } });
  if (!usuaria || usuaria.role !== "USUARIA") {
    throw new Error("Usuaria no encontrada.");
  }
  return usuaria;
}
