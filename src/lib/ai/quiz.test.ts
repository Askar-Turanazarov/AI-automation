import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ prisma: {} }));

import { parseAiAnswer, pickByRules } from "./quiz";

const service = (id: string, category: string, price: number) => ({ id, name: id, category, price, durationMin: 60 });
const catalog = [
  service("diag", "Двигатель", 350_000),
  service("stage1", "Двигатель", 3_500_000),
  service("stage2", "Двигатель", 9_000_000),
  service("exhaust", "Выхлоп", 5_500_000),
  service("tint", "Кузов", 1_200_000),
];

describe("pickByRules", () => {
  it("picks the best service per goal within the budget for the whole package", () => {
    // звук не помещается в 3 млн — пропускается
    expect(pickByRules(catalog, ["power", "sound", "protection"], "low")).toEqual([
      { serviceId: "diag", goal: "power" },
      { serviceId: "tint", goal: "protection" },
    ]);
    // 10 млн на пакет: выхлоп 5,5 млн, на мощность остаётся 4,5 млн — Stage 1, а не Stage 2
    expect(pickByRules(catalog, ["sound", "power"], "mid")).toEqual([
      { serviceId: "exhaust", goal: "sound" },
      { serviceId: "stage1", goal: "power" },
    ]);
    expect(pickByRules(catalog, ["power", "sound"], "high")).toEqual([
      { serviceId: "stage2", goal: "power" },
      { serviceId: "exhaust", goal: "sound" },
    ]);
  });
});

describe("parseAiAnswer", () => {
  const ids = new Set(catalog.map((s) => s.id));

  it("reads JSON (also inside a markdown fence) and drops unknown or repeated services", () => {
    const text =
      '```json\n{"summary":"Stage 1 и выхлоп","items":[{"serviceId":"stage1","why":"мощность"},{"serviceId":"ghost","why":"?"},' +
      '{"serviceId":"stage1","why":"дубль"},{"serviceId":"exhaust","why":"звук"}]}\n```';
    expect(parseAiAnswer(text, ids)).toEqual({
      summary: "Stage 1 и выхлоп",
      items: [
        { serviceId: "stage1", why: "мощность" },
        { serviceId: "exhaust", why: "звук" },
      ],
    });
  });

  it("returns null for garbage or when no valid service is left", () => {
    expect(parseAiAnswer("Извините, не могу помочь", ids)).toBeNull();
    expect(parseAiAnswer("{broken json", ids)).toBeNull();
    expect(parseAiAnswer('{"summary":"x","items":[{"serviceId":"ghost","why":"?"}]}', ids)).toBeNull();
  });
});
