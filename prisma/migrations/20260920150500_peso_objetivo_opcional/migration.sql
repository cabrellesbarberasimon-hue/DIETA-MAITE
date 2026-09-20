-- Peso objetivo deja de ser obligatorio al crear una persona. Los valores
-- ya guardados no se tocan.
ALTER TABLE "Profile" ALTER COLUMN "pesoObjetivoKg" DROP NOT NULL;
