import { describe, expect, it } from "vitest";
import {
  computeBMR,
  computeDeficitKcal,
  computeGET,
  computeObjetivoKcal,
  computeWeeklyBudget,
  computeDailyScore,
  computeDailyBalance,
  activityFactorFor,
} from "./nutrition";

describe("computeBMR (Mifflin-St Jeor)", () => {
  it("hombre: 80kg, 180cm, 30 años", () => {
    // 10*80 + 6.25*180 - 5*30 + 5 = 800 + 1125 - 150 + 5 = 1780
    expect(computeBMR("hombre", 80, 180, 30)).toBe(1780);
  });

  it("mujer: 65kg, 165cm, 28 años", () => {
    // 10*65 + 6.25*165 - 5*28 - 161 = 650 + 1031.25 - 140 - 161 = 1380.25 -> 1380
    expect(computeBMR("mujer", 65, 165, 28)).toBe(1380);
  });

  it("acepta sexo con mayúsculas o variantes", () => {
    expect(computeBMR("Hombre", 80, 180, 30)).toBe(computeBMR("hombre", 80, 180, 30));
    expect(computeBMR("Mujer", 65, 165, 28)).toBe(computeBMR("mujer", 65, 165, 28));
  });
});

describe("computeGET", () => {
  it("BMR x factor de actividad", () => {
    expect(computeGET(1780, 1.5)).toBe(2670);
  });
});

describe("activityFactorFor", () => {
  it("devuelve el factor de los niveles predefinidos", () => {
    expect(activityFactorFor("sedentario")).toBe(1.2);
    expect(activityFactorFor("muy_alto")).toBe(1.9);
  });

  it("personalizado no tiene factor propio", () => {
    expect(activityFactorFor("personalizado")).toBeNull();
  });

  it("valor desconocido devuelve null", () => {
    expect(activityFactorFor("no-existe")).toBeNull();
  });
});

describe("computeDeficitKcal", () => {
  it("modo porcentaje", () => {
    expect(computeDeficitKcal(2670, "porcentaje", 15)).toBe(401); // 2670*0.15=400.5 -> 401
  });

  it("modo manual", () => {
    expect(computeDeficitKcal(2670, "manual", 300)).toBe(300);
  });

  it("modo manual admite superávit (negativo)", () => {
    expect(computeDeficitKcal(2670, "manual", -250)).toBe(-250);
  });
});

describe("computeWeeklyBudget", () => {
  it("kcal objetivo diario x 7", () => {
    expect(computeWeeklyBudget(2270)).toBe(15890);
  });
});

describe("computeObjetivoKcal (ya existente)", () => {
  it("proteína*4 + carbohidratos*4 + grasa*9", () => {
    expect(computeObjetivoKcal(100, 150, 47)).toBe(100 * 4 + 150 * 4 + 47 * 9);
  });
});

describe("computeDailyBalance", () => {
  it("las kcal de los pasos no se suman al gasto total (el GET ya incluye el factor de actividad)", () => {
    const balance = computeDailyBalance({
      kcalIngeridas: 2000,
      kcalEjercicio: 0,
      kcalPasos: 500,
      getKcalBase: 2000,
      objetivoKcal: 2000,
    });
    expect(balance.gastoTotal).toBe(2000);
    expect(balance.kcalPasos).toBe(500);
  });

  it("el ejercicio registrado sí se suma al gasto total", () => {
    const balance = computeDailyBalance({
      kcalIngeridas: 2000,
      kcalEjercicio: 300,
      getKcalBase: 2000,
      objetivoKcal: 2000,
    });
    expect(balance.gastoTotal).toBe(2300);
    expect(balance.deficitReal).toBe(300);
  });
});

describe("computeDailyScore", () => {
  const base = {
    semaforo: "VERDE" as const,
    proteinaIngeridaG: 100,
    proteinaObjetivoG: 100,
    carbohidratosIngeridosG: 150,
    carbohidratosObjetivoG: 150,
    grasasIngeridasG: 50,
    grasasObjetivoG: 50,
    pasos: 10000,
    pasosObjetivo: 10000,
    aguaMl: 2000,
    aguaObjetivoMl: 2000,
  };

  it("día perfecto: 100/100", () => {
    expect(computeDailyScore(base).total).toBe(100);
  });

  it("día vacío (sin nada registrado): 0/100", () => {
    const score = computeDailyScore({
      ...base,
      semaforo: "ROJO",
      proteinaIngeridaG: 0,
      carbohidratosIngeridosG: 0,
      grasasIngeridasG: 0,
      pasos: 0,
      aguaMl: 0,
    });
    expect(score.total).toBe(0);
  });

  it("proteína no penaliza pasarse del objetivo (se queda en el máximo)", () => {
    const score = computeDailyScore({ ...base, proteinaIngeridaG: 200 });
    expect(score.breakdown.proteina.pts).toBe(25);
  });

  it("ámbar da la mitad de los puntos de kcal", () => {
    const score = computeDailyScore({ ...base, semaforo: "AMBAR" });
    expect(score.breakdown.kcal.pts).toBe(15);
  });

  it("pasos y agua a mitad de objetivo dan la mitad de sus puntos", () => {
    const score = computeDailyScore({ ...base, pasos: 5000, aguaMl: 1000 });
    expect(score.breakdown.pasos.pts).toBe(10);
    expect(score.breakdown.agua.pts).toBe(8); // 7.5 -> redondeado a 8
  });
});
