-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USUARIA', 'ADMIN');

-- CreateEnum
CREATE TYPE "Weekday" AS ENUM ('LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO');

-- CreateEnum
CREATE TYPE "MealType" AS ENUM ('DESAYUNO', 'ALMUERZO', 'COMIDA', 'COMIDA_LIBRE_SOCIAL', 'CENA');

-- CreateEnum
CREATE TYPE "LogSource" AS ENUM ('PLANIFICADO', 'LIBRE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sexo" TEXT NOT NULL,
    "edad" INTEGER NOT NULL,
    "alturaCm" INTEGER NOT NULL,
    "pesoInicialKg" DOUBLE PRECISION NOT NULL,
    "pesoObjetivoKg" DOUBLE PRECISION NOT NULL,
    "bmrKcal" INTEGER NOT NULL,
    "factorActividad" DOUBLE PRECISION NOT NULL,
    "getKcal" INTEGER NOT NULL,
    "deficitDiarioKcal" INTEGER NOT NULL,
    "objetivoKcalMediaDia" INTEGER NOT NULL,
    "presupuestoSemanalKcal" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DayPlan" (
    "id" TEXT NOT NULL,
    "weekday" "Weekday" NOT NULL,
    "tipoDia" TEXT NOT NULL,
    "objetivoKcal" INTEGER NOT NULL,
    "objetivoProteinaG" INTEGER NOT NULL,
    "objetivoCarbohidratosG" INTEGER NOT NULL,
    "objetivoGrasasG" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DayPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlannedMeal" (
    "id" TEXT NOT NULL,
    "dayPlanId" TEXT NOT NULL,
    "mealType" "MealType" NOT NULL,
    "descripcion" TEXT NOT NULL,
    "kcal" INTEGER NOT NULL,
    "proteinaG" DOUBLE PRECISION NOT NULL,
    "carbohidratosG" DOUBLE PRECISION NOT NULL,
    "grasasG" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlannedMeal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MealLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "mealType" "MealType" NOT NULL,
    "source" "LogSource" NOT NULL,
    "plannedMealId" TEXT,
    "nombre" TEXT NOT NULL,
    "kcal" INTEGER NOT NULL,
    "proteinaG" DOUBLE PRECISION NOT NULL,
    "carbohidratosG" DOUBLE PRECISION NOT NULL,
    "grasasG" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MealLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExerciseType" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "met" DOUBLE PRECISION NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ExerciseType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExerciseLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "exerciseTypeId" TEXT NOT NULL,
    "minutos" INTEGER NOT NULL,
    "pesoUsadoKg" DOUBLE PRECISION NOT NULL,
    "kcalQuemadas" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExerciseLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeightLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "pesoKg" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeightLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DayPlan_weekday_key" ON "DayPlan"("weekday");

-- CreateIndex
CREATE UNIQUE INDEX "PlannedMeal_dayPlanId_mealType_key" ON "PlannedMeal"("dayPlanId", "mealType");

-- CreateIndex
CREATE INDEX "MealLog_userId_fecha_idx" ON "MealLog"("userId", "fecha");

-- CreateIndex
CREATE UNIQUE INDEX "ExerciseType_nombre_key" ON "ExerciseType"("nombre");

-- CreateIndex
CREATE INDEX "ExerciseLog_userId_fecha_idx" ON "ExerciseLog"("userId", "fecha");

-- CreateIndex
CREATE INDEX "WeightLog_userId_fecha_idx" ON "WeightLog"("userId", "fecha");

-- CreateIndex
CREATE UNIQUE INDEX "WeightLog_userId_fecha_key" ON "WeightLog"("userId", "fecha");

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlannedMeal" ADD CONSTRAINT "PlannedMeal_dayPlanId_fkey" FOREIGN KEY ("dayPlanId") REFERENCES "DayPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealLog" ADD CONSTRAINT "MealLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealLog" ADD CONSTRAINT "MealLog_plannedMealId_fkey" FOREIGN KEY ("plannedMealId") REFERENCES "PlannedMeal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseLog" ADD CONSTRAINT "ExerciseLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseLog" ADD CONSTRAINT "ExerciseLog_exerciseTypeId_fkey" FOREIGN KEY ("exerciseTypeId") REFERENCES "ExerciseType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeightLog" ADD CONSTRAINT "WeightLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
