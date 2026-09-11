import { describe, expect, it } from "vitest";
import { computeFreeStarts, overlaps } from "./slots";
import { addDays, isoWeekday } from "../time";

const work = { start: 600, end: 1080 }; // 10:00–18:00

describe("computeFreeStarts", () => {
  it("returns nothing on a day off", () => {
    expect(computeFreeStarts({ work: null, busy: [], duration: 60 })).toEqual([]);
  });

  it("respects shift bounds", () => {
    const s = computeFreeStarts({ work, busy: [], duration: 120 });
    expect(s[0]).toBe(600);
    expect(s.at(-1)).toBe(960); // 16:00 + 2ч = 18:00
  });

  it("excludes overlaps with existing bookings, allows touching edges", () => {
    const s = computeFreeStarts({ work, busy: [{ start: 720, end: 780 }], duration: 60 });
    expect(s).toContain(660); // 11:00–12:00 впритык
    expect(s).not.toContain(690);
    expect(s).not.toContain(720);
    expect(s).toContain(780);
  });

  it("drops past times", () => {
    const s = computeFreeStarts({ work, busy: [], duration: 60, notBefore: 845 });
    expect(s[0]).toBe(870);
  });
});

describe("helpers", () => {
  it("overlaps", () => {
    expect(overlaps({ start: 0, end: 60 }, { start: 60, end: 90 })).toBe(false);
    expect(overlaps({ start: 0, end: 61 }, { start: 60, end: 90 })).toBe(true);
  });
  it("weekday and addDays", () => {
    expect(isoWeekday("2026-09-13")).toBe(7);
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });
});
