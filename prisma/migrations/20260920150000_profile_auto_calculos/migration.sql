-- Profile: BMR/GET pasan a calcularse automáticamente (Mifflin-St Jeor +
-- factor de actividad) para las personas nuevas. Los perfiles existentes
-- conservan su valor tal cual (bmrEsManual/getEsManual = true por defecto),
-- y no se recalculan solos hasta que el admin pulse "Recalcular".
ALTER TABLE "Profile" ADD COLUMN "bmrEsManual" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Profile" ADD COLUMN "getEsManual" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Profile" ADD COLUMN "factorActividadEtiqueta" TEXT;
ALTER TABLE "Profile" ADD COLUMN "objetivoPrincipal" TEXT;
ALTER TABLE "Profile" ADD COLUMN "objetivoGrasaCorporalPct" DOUBLE PRECISION;
ALTER TABLE "Profile" ADD COLUMN "deficitModo" TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE "Profile" ADD COLUMN "deficitPorcentaje" DOUBLE PRECISION;
