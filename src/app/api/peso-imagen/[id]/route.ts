import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireUser();
  const { id } = await params;

  const weightLog = await prisma.weightLog.findUnique({ where: { id } });
  if (!weightLog || !weightLog.imagen || !weightLog.imagenMime) {
    return NextResponse.json({ error: "No hay imagen." }, { status: 404 });
  }
  if (session.role !== "ADMIN" && weightLog.userId !== session.sub) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  return new NextResponse(weightLog.imagen, {
    headers: {
      "Content-Type": weightLog.imagenMime,
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
