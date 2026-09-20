-- PlannedMeal deja de ser "una fila por día+comida" para admitir varias
-- opciones (alternativas) por comida planificada. Se quita el único y se
-- deja un índice normal para las consultas por dayPlanId+mealType.
DROP INDEX "PlannedMeal_dayPlanId_mealType_key";
CREATE INDEX "PlannedMeal_dayPlanId_mealType_idx" ON "PlannedMeal"("dayPlanId", "mealType");
