import { prisma } from "@/lib/prisma";
import { getUsuariaById } from "@/lib/data/usuaria";
import { WEEKDAY_ORDER, WEEKDAY_LABEL } from "@/lib/nutrition";
import { CurrentWeightEditor, ProfileEditor, DayTypeManager, DayPlanCard } from "./PlanEditor";

export default async function AdminUsuariaPlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const usuaria = await getUsuariaById(id);

  const [dayPlans, dayTypes, profile, lastWeight] = await Promise.all([
    prisma.dayPlan.findMany({
      where: { userId: usuaria.id },
      include: { comidas: { orderBy: { mealType: "asc" } } },
    }),
    prisma.dayType.findMany({ where: { userId: usuaria.id }, orderBy: { nombre: "asc" } }),
    prisma.profile.findUnique({ where: { userId: usuaria.id } }),
    prisma.weightLog.findFirst({ where: { userId: usuaria.id }, orderBy: { fecha: "desc" } }),
  ]);

  const dayPlansByWeekday = new Map(dayPlans.map((d) => [d.weekday, d]));
  const pesoActual = lastWeight?.pesoKg ?? profile?.pesoInicialKg ?? 0;

  return (
    <div className="mx-auto max-w-md space-y-5">
      <h1 className="text-lg font-bold text-slate-900">Plan de {usuaria.name}</h1>

      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="mb-3 text-sm font-semibold text-slate-500">
          Peso actual (usado en las fórmulas de ejercicio)
        </h2>
        <CurrentWeightEditor userId={usuaria.id} pesoActualKg={pesoActual} />
      </section>

      {profile && <ProfileEditor userId={usuaria.id} profile={profile} />}

      <DayTypeManager userId={usuaria.id} dayTypes={dayTypes} />

      <section className="space-y-3">
        <h2 className="px-1 text-sm font-semibold text-slate-500">Menú semanal</h2>
        {profile &&
          WEEKDAY_ORDER.map((weekday) => {
            const dayPlan = dayPlansByWeekday.get(weekday);
            if (!dayPlan) return null;
            return (
              <DayPlanCard
                key={weekday}
                userId={usuaria.id}
                dayTypes={dayTypes}
                profileProteinaG={profile.objetivoProteinaG}
                profileGrasasG={profile.objetivoGrasasG}
                dayPlan={{
                  weekday,
                  weekdayLabel: WEEKDAY_LABEL[weekday],
                  dayTypeId: dayPlan.dayTypeId,
                  comidas: dayPlan.comidas,
                }}
              />
            );
          })}
      </section>
    </div>
  );
}
