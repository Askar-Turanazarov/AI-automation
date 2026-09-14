import { describe, expect, it } from "vitest";
import { formatDuration, formatWhen } from "./dates";

describe("formatWhen", () => {
  it("дата и интервал времени на языке пользователя", () => {
    const b = { date: "2026-09-11", startMin: 600, endMin: 750 };
    expect(formatWhen(b, "ru")).toBe("Пт, 11 сентября, 10:00–12:30");
    expect(formatWhen(b, "en")).toBe("Fri, Sep 11, 10:00–12:30");
    expect(formatWhen(b, "uz")).toBe("11-sentabr, juma, 10:00–12:30");
  });
});

describe("formatDuration", () => {
  const units = { h: "ч", min: "мин" };
  it("меньше часа — в минутах", () => expect(formatDuration(45, units)).toBe("45 мин"));
  it("от часа — в часах с одним знаком", () => {
    expect(formatDuration(60, units)).toBe("1 ч");
    expect(formatDuration(90, units)).toBe("1.5 ч");
    expect(formatDuration(100, units)).toBe("1.7 ч");
  });
});
