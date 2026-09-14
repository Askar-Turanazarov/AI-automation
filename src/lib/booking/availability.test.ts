import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// BUSINESS_TZ читается при импорте time.ts — фиксируем до импортов
vi.hoisted(() => vi.stubEnv("BUSINESS_TZ", "Asia/Tashkent"));

const db = vi.hoisted(() => ({ service: { findUnique: vi.fn() }, master: { findMany: vi.fn() } }));
vi.mock("@/lib/db", () => ({ prisma: db }));

import { getAvailableDays, getDaySlots, MAX_DAYS_AHEAD } from "./availability";

type Busy = { date: string; startMin: number; endMin: number };
const ALL_WEEK = [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({ weekday, startMin: 600, endMin: 720 })); // 10:00–12:00

const master = (id: string, o: { schedules?: typeof ALL_WEEK; timeOffs?: { date: string }[]; bookings?: Busy[] } = {}) => ({
  id,
  name: `Master ${id}`,
  specialty: "Tuner",
  photoUrl: "",
  color: "#FF5A1F",
  schedules: ALL_WEEK,
  timeOffs: [],
  bookings: [],
  ...o,
});

const TODAY = "2026-09-14"; // Пн
const TOMORROW = "2026-09-15";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-14T05:05:00Z")); // 10:05 в Ташкенте
  db.service.findUnique.mockResolvedValue({ id: "s1", name: "Service", durationMin: 60, active: true });
  db.master.findMany.mockResolvedValue([master("m1")]);
});

afterEach(() => {
  vi.useRealTimers();
  vi.resetAllMocks();
});

afterAll(() => vi.unstubAllEnvs());

const times = (r: Awaited<ReturnType<typeof getDaySlots>>) => r!.slots.map((s) => s.time);

describe("getDaySlots", () => {
  it("returns null for a missing or inactive service", async () => {
    db.service.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: "s1", durationMin: 60, active: false });
    expect(await getDaySlots({ serviceId: "s1", date: TOMORROW })).toBeNull();
    expect(await getDaySlots({ serviceId: "s1", date: TOMORROW })).toBeNull();
    expect(db.master.findMany).not.toHaveBeenCalled();
  });

  it("applies a 30-minute lead time only for today", async () => {
    expect(times(await getDaySlots({ serviceId: "s1", date: TODAY }))).toEqual([660]); // 10:05 + 30 → с 10:35
    expect(times(await getDaySlots({ serviceId: "s1", date: TOMORROW }))).toEqual([600, 630, 660]);
  });

  it("returns nothing outside [today, today + MAX_DAYS_AHEAD]", async () => {
    expect(MAX_DAYS_AHEAD).toBe(60);
    expect(times(await getDaySlots({ serviceId: "s1", date: "2026-09-13" }))).toEqual([]);
    expect(times(await getDaySlots({ serviceId: "s1", date: "2026-11-13" }))).toEqual([600, 630, 660]);
    expect(times(await getDaySlots({ serviceId: "s1", date: "2026-11-14" }))).toEqual([]);
  });

  it("returns no slots on a time-off day or without a schedule", async () => {
    db.master.findMany.mockResolvedValue([master("m1", { timeOffs: [{ date: TOMORROW }] }), master("m2", { schedules: [] })]);
    const r = await getDaySlots({ serviceId: "s1", date: TOMORROW });
    expect(r!.slots).toEqual([]);
    expect(r!.masters.map((m) => m.slots)).toEqual([[], []]);
  });

  it("merges masters by time (time → masterIds) and exposes per-master slots", async () => {
    db.master.findMany.mockResolvedValue([
      master("m1"),
      master("m2", {
        bookings: [
          { date: TOMORROW, startMin: 600, endMin: 660 },
          { date: TODAY, startMin: 660, endMin: 720 },
        ],
      }),
    ]);
    const r = await getDaySlots({ serviceId: "s1", date: TOMORROW, masterId: null });
    expect(r).toMatchObject({ service: { id: "s1" }, date: TOMORROW });
    expect(r!.slots).toEqual([
      { time: 600, masterIds: ["m1"] },
      { time: 630, masterIds: ["m1"] },
      { time: 660, masterIds: ["m1", "m2"] },
    ]);
    expect(r!.masters[1]).toEqual({ id: "m2", name: "Master m2", specialty: "Tuner", photoUrl: "", color: "#FF5A1F", slots: [660] });
  });

  it("queries active masters of the service for that single date", async () => {
    await getDaySlots({ serviceId: "s1", date: TOMORROW, masterId: "m1" });
    expect(db.service.findUnique).toHaveBeenCalledWith({ where: { id: "s1" } });
    expect(db.master.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { active: true, id: "m1", services: { some: { serviceId: "s1" } } },
        include: expect.objectContaining({
          timeOffs: { where: { date: { gte: TOMORROW, lte: TOMORROW } } },
          bookings: expect.objectContaining({ where: { date: { gte: TOMORROW, lte: TOMORROW }, status: { not: "cancelled" } } }),
        }),
      }),
    );
  });
});

describe("getAvailableDays", () => {
  it("returns null for an inactive service", async () => {
    db.service.findUnique.mockResolvedValue({ id: "s1", durationMin: 60, active: false });
    expect(await getAvailableDays({ serviceId: "s1", from: TODAY, days: 7 })).toBeNull();
  });

  it("counts distinct start times across masters per day", async () => {
    db.master.findMany.mockResolvedValue([
      master("m1", { timeOffs: [{ date: "2026-09-16" }] }),
      master("m2", { schedules: ALL_WEEK.map((s) => ({ ...s, startMin: 660, endMin: 780 })) }), // 11:00–13:00
    ]);
    const r = await getAvailableDays({ serviceId: "s1", from: "2026-09-13", days: 4 });
    expect(r).toEqual([
      { date: "2026-09-13", slots: 0 }, // вчера
      { date: TODAY, slots: 3 }, // 660, 690, 720 (с запасом от 10:35)
      { date: TOMORROW, slots: 5 }, // 600…720
      { date: "2026-09-16", slots: 3 }, // m1 в отгуле
    ]);
    expect(db.master.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({ timeOffs: { where: { date: { gte: "2026-09-13", lte: "2026-09-16" } } } }),
      }),
    );
  });

  it("cuts off days beyond the 60-day window relative to today", async () => {
    const r = await getAvailableDays({ serviceId: "s1", from: "2026-11-12", days: 3 });
    expect(r).toEqual([
      { date: "2026-11-12", slots: 3 },
      { date: "2026-11-13", slots: 3 },
      { date: "2026-11-14", slots: 0 },
    ]);
  });

  it("clamps days to [1, MAX_DAYS_AHEAD + 1]", async () => {
    expect(await getAvailableDays({ serviceId: "s1", from: TOMORROW, days: 0 })).toHaveLength(1);
    expect(await getAvailableDays({ serviceId: "s1", from: TOMORROW, days: -5 })).toHaveLength(1);
    const r = await getAvailableDays({ serviceId: "s1", from: TODAY, days: 1000 });
    expect(r).toHaveLength(61);
    expect(r!.at(-1)).toEqual({ date: "2026-11-13", slots: 3 });
  });
});
