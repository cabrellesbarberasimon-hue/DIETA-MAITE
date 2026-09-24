-- Fecha en la que el admin confirmó tener el consentimiento de la persona
-- para tratar sus datos de salud (casilla al dar de alta). Null en
-- perfiles creados antes de este campo.
ALTER TABLE "Profile" ADD COLUMN "consentimientoFecha" TIMESTAMP(3);
