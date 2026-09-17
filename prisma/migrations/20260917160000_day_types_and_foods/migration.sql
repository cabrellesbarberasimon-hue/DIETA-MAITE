-- Profile: proteína y grasa objetivo pasan a ser constantes (ya no varían por día)
ALTER TABLE "Profile" ADD COLUMN "objetivoProteinaG" INTEGER;
ALTER TABLE "Profile" ADD COLUMN "objetivoGrasasG" INTEGER;
UPDATE "Profile" SET "objetivoProteinaG" = 100, "objetivoGrasasG" = 47
WHERE "objetivoProteinaG" IS NULL;
ALTER TABLE "Profile" ALTER COLUMN "objetivoProteinaG" SET NOT NULL;
ALTER TABLE "Profile" ALTER COLUMN "objetivoGrasasG" SET NOT NULL;
ALTER TABLE "Profile" DROP COLUMN "objetivoKcalMediaDia";

-- CreateTable: DayType
CREATE TABLE "DayType" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "carbohidratosG" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DayType_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DayType_userId_nombre_key" ON "DayType"("userId", "nombre");

ALTER TABLE "DayType" ADD CONSTRAINT "DayType_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: dos tipos de día por defecto para cada usuaria ya existente
-- (editables después desde el panel de admin). Sin filas en Profile, no-op.
INSERT INTO "DayType" ("id", "userId", "nombre", "carbohidratosG", "updatedAt")
SELECT gen_random_uuid()::text, p."userId", 'Entrenamiento', 150, CURRENT_TIMESTAMP
FROM "Profile" p;

INSERT INTO "DayType" ("id", "userId", "nombre", "carbohidratosG", "updatedAt")
SELECT gen_random_uuid()::text, p."userId", 'Descanso', 100, CURRENT_TIMESTAMP
FROM "Profile" p;

-- DayPlan: cada día pasa a referenciar un DayType en vez de guardar sus
-- propios objetivos de macros y una etiqueta de texto libre.
ALTER TABLE "DayPlan" ADD COLUMN "dayTypeId" TEXT;

UPDATE "DayPlan" dp
SET "dayTypeId" = dt."id"
FROM "DayType" dt
WHERE dt."userId" = dp."userId" AND dt."nombre" = 'Descanso';

ALTER TABLE "DayPlan" ALTER COLUMN "dayTypeId" SET NOT NULL;
ALTER TABLE "DayPlan" DROP COLUMN "tipoDia";
ALTER TABLE "DayPlan" DROP COLUMN "objetivoKcal";
ALTER TABLE "DayPlan" DROP COLUMN "objetivoProteinaG";
ALTER TABLE "DayPlan" DROP COLUMN "objetivoCarbohidratosG";
ALTER TABLE "DayPlan" DROP COLUMN "objetivoGrasasG";

ALTER TABLE "DayPlan" ADD CONSTRAINT "DayPlan_dayTypeId_fkey" FOREIGN KEY ("dayTypeId") REFERENCES "DayType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable: Food (tabla de composición de alimentos, compartida)
CREATE TABLE "Food" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "busqueda" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "kcal" INTEGER NOT NULL,
    "proteinaG" DOUBLE PRECISION NOT NULL,
    "carbohidratosG" DOUBLE PRECISION NOT NULL,
    "grasasG" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Food_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Food_nombre_categoria_key" ON "Food"("nombre", "categoria");
CREATE INDEX "Food_categoria_idx" ON "Food"("categoria");
CREATE INDEX "Food_busqueda_idx" ON "Food"("busqueda");
