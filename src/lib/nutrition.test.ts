import { describe, expect, it } from "vitest";
import {
  computeBMR,
  computeDeficitKcal,
  computeGET,
  computeObjetivoKcal,
  computeWeeklyBudget,
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
