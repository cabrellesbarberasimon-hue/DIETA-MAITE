-- ExerciseType: permitir tipos de ejercicio propios por usuaria (userId opcional)
ALTER TABLE "ExerciseType" ADD COLUMN "userId" TEXT;

DROP INDEX "ExerciseType_nombre_key";

CREATE UNIQUE INDEX "ExerciseType_userId_nombre_key" ON "ExerciseType"("userId", "nombre");

ALTER TABLE "ExerciseType" ADD CONSTRAINT "ExerciseType_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "WaterLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "ml" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WaterLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WaterLog_userId_fecha_idx" ON "WaterLog"("userId", "fecha");

ALTER TABLE "WaterLog" ADD CONSTRAINT "WaterLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "StepsLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "pasos" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StepsLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StepsLog_userId_fecha_key" ON "StepsLog"("userId", "fecha");
CREATE INDEX "StepsLog_userId_fecha_idx" ON "StepsLog"("userId", "fecha");

ALTER TABLE "StepsLog" ADD CONSTRAINT "StepsLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
