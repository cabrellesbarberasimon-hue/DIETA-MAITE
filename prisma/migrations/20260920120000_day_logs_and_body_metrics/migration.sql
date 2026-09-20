-- DayType: el tipo de día ya no se asigna por plantilla semanal (DayPlan),
-- se elige a mano cada fecha concreta (ver DayLog). Necesitamos un tipo
-- "predeterminado" por usuaria para los días en los que todavía no se ha
-- elegido nada.
ALTER TABLE "DayType" ADD COLUMN "predeterminado" BOOLEAN NOT NULL DEFAULT false;

UPDATE "DayType" SET "predeterminado" = true WHERE "nombre" = 'Descanso';

-- Si alguna usuaria no tiene ningún tipo "Descanso" (nombres personalizados),
-- marca como predeterminado el primero que se creó, para no dejarla sin uno.
UPDATE "DayType" dt
SET "predeterminado" = true
FROM (
  SELECT DISTINCT ON ("userId") "userId", "id"
  FROM "DayType"
  ORDER BY "userId", "updatedAt" ASC
) primero
WHERE dt."id" = primero."id"
  AND NOT EXISTS (
    SELECT 1 FROM "DayType" x WHERE x."userId" = dt."userId" AND x."predeterminado" = true
  );

CREATE UNIQUE INDEX "DayType_userId_predeterminado_key" ON "DayType"("userId") WHERE "predeterminado" = true;

-- DayPlan ya no guarda el tipo de día (solo el menú planificado por día de semana)
ALTER TABLE "DayPlan" DROP CONSTRAINT "DayPlan_dayTypeId_fkey";
ALTER TABLE "DayPlan" DROP COLUMN "dayTypeId";

-- CreateTable: DayLog (tipo de día elegido a mano para una fecha concreta)
CREATE TABLE "DayLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "dayTypeId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DayLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DayLog_userId_fecha_key" ON "DayLog"("userId", "fecha");
CREATE INDEX "DayLog_userId_fecha_idx" ON "DayLog"("userId", "fecha");

ALTER TABLE "DayLog" ADD CONSTRAINT "DayLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DayLog" ADD CONSTRAINT "DayLog_dayTypeId_fkey" FOREIGN KEY ("dayTypeId") REFERENCES "DayType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- WeightLog: más métricas corporales (todas opcionales) + imagen opcional
-- (p.ej. una foto del informe de la báscula/app de composición corporal)
ALTER TABLE "WeightLog" ADD COLUMN "grasaCorporalPct" DOUBLE PRECISION;
ALTER TABLE "WeightLog" ADD COLUMN "masaMuscularKg" DOUBLE PRECISION;
ALTER TABLE "WeightLog" ADD COLUMN "pliegues" DOUBLE PRECISION;
ALTER TABLE "WeightLog" ADD COLUMN "aguaCorporalPct" DOUBLE PRECISION;
ALTER TABLE "WeightLog" ADD COLUMN "grasaVisceral" DOUBLE PRECISION;
ALTER TABLE "WeightLog" ADD COLUMN "tasaMetabolicaBasalKcal" INTEGER;
ALTER TABLE "WeightLog" ADD COLUMN "imagen" BYTEA;
ALTER TABLE "WeightLog" ADD COLUMN "imagenMime" TEXT;
