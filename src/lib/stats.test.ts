import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// BUSINESS_TZ читается при импорте time.ts — фиксируем до импортов
vi.hoisted(() => vi.stubEnv("BUSINESS_TZ", "Asia/Tashkent"));

const db = vi.hoisted(() => ({ master: { findMany: vi.fn() }, booking: { findMany: vi.fn() } }));
vi.mock("@/lib/db", () => ({ prisma: db }));

import { getDashboardStats, getWorkload } from "./stats";

let seq = 0;
const bk = (date: string, startMin: number, endMin: number, price: number, o: { status?: string; source?: string } = {}) => ({
  id: `b${++seq}`,
  date,
  startMin,
  endMin,
  status: "confirmed",
  source: "web",
  service: { name: "Service", price },
  ...o,
});

const MON_SAT = [1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, startMin: 600, endMin: 1080 })); // 8 ч

const master = (id: string, o: { schedules?: typeof MON_SAT; timeOffs?: { date: string }[]; bookings?: ReturnType<typeof bk>[] } = {}) => ({
  id,
  name: `Master ${id}`,
  nameLatin: "",
  specialty: "Tuner",
  color: "#FF5A1F",
  schedules: MON_SAT,
  timeOffs: [],
  bookings: [],
  ...o,
});

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-14T05:00:00Z")); // Пн 10:00 в Ташкенте
});

afterEach(() => {
  vi.useRealTimers();
  vi.resetAllMocks();
});

afterAll(() => vi.unstubAllEnvs());

describe("getWorkload", () => {
  it("computes load % from working minutes minus time-off days", async () => {
    db.master.findMany.mockResolvedValue([
      master("m1", {
        timeOffs: [{ date: "2026-09-15" }],
        bookings: [bk("2026-09-14", 600, 1080, 2_000_000), bk("2026-09-16", 600, 720, 500_000)],
      }),
      master("m2", { schedules: [] }),
    ]);
    const [m1, m2] = await getWorkload("2026-09-14", "2026-09-20");
    // Пн–Сб по 480 мин = 2880, минус отгул во вторник = 2400; занято 480 + 120 = 600 → 25%
    expect(m1).toEqual({
      id: "m1",
      name: "Master m1",
      nameLatin: "",
      specialty: "Tuner",
      color: "#FF5A1F",
      bookings: 2,
      bookedMin: 600,
      workMin: 2400,
      load: 25,
      revenue: 2_500_000,
    });
    expect(m2).toMatchObject({ workMin: 0, bookedMin: 0, load: 0 });
  });

  it("excludes cancelled bookings via the query and includes both range ends", async () => {
    db.master.findMany.mockResolvedValue([master("m1", { bookings: [bk("2026-09-14", 600, 660, 1)] })]);
    const [m1] = await getWorkload("2026-09-14", "2026-09-14");
    expect(m1).toMatchObject({ workMin: 480, load: 13 }); // 60 / 480 = 12.5 → 13
    expect(db.master.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { active: true },
        include: expect.objectContaining({
          timeOffs: { where: { date: { gte: "2026-09-14", lte: "2026-09-14" } } },
          bookings: { where: { date: { gte: "2026-09-14", lte: "2026-09-14" }, status: { not: "cancelled" } }, include: { service: true } },
        }),
      }),
    );
  });
});

describe("getDashboardStats", () => {
  it("builds KPIs, ignoring cancelled bookings except for cancelRate", async () => {
    const today = bk("2026-09-14", 600, 720, 1_000_000);
    const future = bk("2026-09-16", 600, 840, 3_000_000, { source: "bot" });
    const bookings = [
      today,
      bk("2026-09-14", 720, 780, 2_000_000, { status: "cancelled", source: "bot" }),
      bk("2026-09-10", 600, 660, 500_000, { status: "done", source: "ai" }),
      future,
    ];
    db.booking.findMany.mockImplementation(async (args: { take?: number }) => (args.take ? [] : bookings));
    db.master.findMany.mockResolvedValue([master("m1", { timeOffs: [{ date: "2026-09-15" }], bookings: [today, future] })]);

    const s = await getDashboardStats();

    expect(s.today).toBe("2026-09-14");
    expect(s.kpi).toEqual({
      bookingsToday: 1,
      bookingsWeek: 2,
      revenueMonth: 1_500_000, // с 1-го числа по сегодня, будущие не считаются
      avgCheck: 750_000,
      loadWeek: 15, // 360 / 2400
      cancelRate: 25,
    });
    expect(db.booking.findMany).toHaveBeenCalledWith({ where: { date: { gte: "2026-08-18", lte: "2026-09-20" } }, include: { service: true } });

    expect(s.series).toHaveLength(35);
    expect(s.series[0].date).toBe("2026-08-18");
    expect(s.series.find((d) => d.date === "2026-09-14")).toEqual({ date: "2026-09-14", bookings: 1, revenue: 1_000_000, future: false });
    expect(s.series.find((d) => d.date === "2026-09-16")).toMatchObject({ bookings: 1, future: true });

    expect(s.sources).toEqual([
      { source: "web", count: 1 },
      { source: "bot", count: 1 },
      { source: "ai", count: 1 },
    ]);
    expect(s.heat).toEqual({ "1-10": 1, "1-11": 1, "3-10": 1, "3-11": 1, "3-12": 1, "3-13": 1, "4-10": 1 });
  });
});
