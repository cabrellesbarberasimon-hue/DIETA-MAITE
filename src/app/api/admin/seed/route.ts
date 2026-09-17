import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { runSeed } from "@/lib/seed-core";

export const dynamic = "force-dynamic";

function tokenMatches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Endpoint de arranque único: puebla la base de datos de producción (usuarios,
 * perfil, menú semanal, tabla MET) sin necesitar acceso de red desde fuera de
 * Vercel. Protegido por SEED_TOKEN; si no está configurado, el endpoint no
 * hace nada. Idempotente (no pisa datos ya existentes).
 */
export async function GET(request: NextRequest) {
  const expected = process.env.SEED_TOKEN;
  if (!expected) {
    return NextResponse.json({ error: "SEED_TOKEN no configurado." }, { status: 404 });
  }

  const provided = request.nextUrl.searchParams.get("token") ?? "";
  if (!tokenMatches(provided, expected)) {
    return NextResponse.json({ error: "Token inválido." }, { status: 403 });
  }

  const maiteEmail = process.env.SEED_MAITE_EMAIL ?? "maite@example.com";
  const maitePassword = process.env.SEED_MAITE_PASSWORD;
  const simonEmail = process.env.SEED_SIMON_EMAIL ?? "simon@example.com";
  const simonPassword = process.env.SEED_SIMON_PASSWORD;

  if (!maitePassword || !simonPassword) {
    return NextResponse.json(
      { error: "Configura SEED_MAITE_PASSWORD y SEED_SIMON_PASSWORD antes de sembrar." },
      { status: 400 },
    );
  }

  const result = await runSeed(prisma, { maiteEmail, maitePassword, simonEmail, simonPassword });

  return NextResponse.json({
    ok: true,
    alreadySeeded: result.alreadySeeded,
    usuaria: result.maiteEmail,
    admin: result.simonEmail,
  });
}
