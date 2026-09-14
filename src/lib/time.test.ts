import { afterEach, describe, expect, it, vi } from "vitest";
import { addDays, addMonths, daysBetween, formatTimeRange, hhmmToMin, isoWeekday, minToHHMM, monthGrid } from "./time";

// BUSINESS_TZ читается при импорте модуля — для каждого пояса грузим модуль заново
async function loadTime(tz: string) {
  vi.stubEnv("BUSINESS_TZ", tz);
  vi.resetModules();
  return import("./time");
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("business timezone", () => {
  it("defaults to Asia/Tashkent", async () => {
    expect((await loadTime("")).BUSINESS_TZ).toBe("Asia/Tashkent");
  });

  it("todayISO / nowMinutes switch at local midnight (UTC+5)", async () => {
    const t = await loadTime("Asia/Tashkent");
    vi.useFakeTimers();

    vi.setSystemTime(new Date("2026-09-14T18:59:00Z"));
    expect(t.todayISO()).toBe("2026-09-14");
    expect(t.nowMinutes()).toBe(1439);

    vi.setSystemTime(new Date("2026-09-14T19:00:00Z"));
    expect(t.todayISO()).toBe("2026-09-15");
    expect(t.nowMinutes()).toBe(0);

    vi.setSystemTime(new Date("2026-12-31T19:30:00Z"));
    expect(t.todayISO()).toBe("2027-01-01");
    expect(t.nowMinutes()).toBe(30);
  });

  it("honours BUSINESS_TZ from env", async () => {
    const t = await loadTime("UTC");
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-14T19:00:00Z"));
    expect(t.BUSINESS_TZ).toBe("UTC");
    expect(t.todayISO()).toBe("2026-09-14");
    expect(t.nowMinutes()).toBe(1140);
  });
});

describe("date helpers", () => {
  it("isoWeekday: 1 = Mon … 7 = Sun", () => {
    expect(isoWeekday("2026-09-14")).toBe(1);
    expect(isoWeekday("2026-09-19")).toBe(6);
    expect(isoWeekday("2026-09-20")).toBe(7);
  });

  it("addDays crosses month / year / leap boundaries", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2027-01-01", -1)).toBe("2026-12-31");
    expect(addDays("2026-09-14", 60)).toBe("2026-11-13");
    expect(addDays("2026-09-14", 0)).toBe("2026-09-14");
  });

  it("daysBetween is signed and calendar-based", () => {
    expect(daysBetween("2026-12-31", "2027-01-01")).toBe(1);
    expect(daysBetween("2026-09-14", "2026-09-10")).toBe(-4);
    expect(daysBetween("2026-09-14", "2026-09-14")).toBe(0);
    expect(daysBetween("2028-02-01", "2028-03-01")).toBe(29);
  });

  it("minToHHMM / hhmmToMin", () => {
    expect(minToHHMM(0)).toBe("00:00");
    expect(minToHHMM(545)).toBe("09:05");
    expect(minToHHMM(1439)).toBe("23:59");
    expect(minToHHMM(1440)).toBe("24:00"); // не заворачивается через полночь
    expect(hhmmToMin("09:05")).toBe(545);
    expect(hhmmToMin("23:59")).toBe(1439);
    expect(hhmmToMin("9")).toBe(540); // минуты необязательны
  });

  it("formatTimeRange", () => {
    expect(formatTimeRange(600, 750)).toBe("10:00–12:30");
  });
});

describe("calendar helpers", () => {
  it("addMonths crosses year boundaries", () => {
    expect(addMonths("2026-12", 1)).toBe("2027-01");
    expect(addMonths("2026-01", -1)).toBe("2025-12");
    expect(addMonths("2026-09", 0)).toBe("2026-09");
  });

  it("monthGrid: 42 days starting on the Monday before the 1st", () => {
    const grid = monthGrid("2026-09"); // 1 сентября 2026 — вторник
    expect(grid).toHaveLength(42);
    expect(grid[0]).toBe("2026-08-31");
    expect(grid[1]).toBe("2026-09-01");
    expect(grid[41]).toBe("2026-10-11");
    expect(monthGrid("2026-06")[0]).toBe("2026-06-01"); // месяц с понедельника
  });
});
