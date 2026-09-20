-- Biblioteca compartida de platos ("opciones de comida" reutilizables entre
-- personas), independiente de PlannedMeal: solo copia valores al usarse.
CREATE TABLE "MealTemplate" (
    "id" TEXT NOT NULL,
    "mealType" "MealType" NOT NULL,
    "descripcion" TEXT NOT NULL,
    "busqueda" TEXT NOT NULL,
    "kcal" INTEGER NOT NULL,
    "proteinaG" DOUBLE PRECISION NOT NULL,
    "carbohidratosG" DOUBLE PRECISION NOT NULL,
    "grasasG" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MealTemplate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MealTemplate_mealType_idx" ON "MealTemplate"("mealType");

CREATE INDEX "MealTemplate_busqueda_idx" ON "MealTemplate"("busqueda");
