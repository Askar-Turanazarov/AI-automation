import { prisma } from "@/lib/db";
import { addDays, daysBetween, isoWeekday, todayISO } from "@/lib/time";

const ACTIVE = { not: "cancelled" };

/** Загрузка мастеров: забронированные минуты / рабочие минуты за период [from, to] */
export async function getWorkload(from: string, to: string) {
  const masters = await prisma.master.findMany({
    where: { active: true },
    orderBy: { createdAt: "asc" },
    include: {
      schedules: true,
      timeOffs: { where: { date: { gte: from, lte: to } } },
      bookings: { where: { date: { gte: from, lte: to }, status: ACTIVE }, include: { service: true } },
    },
  });
  const span = daysBetween(from, to) + 1;
  return masters.map((m) => {
    let workMin = 0;
    for (let i = 0; i < span; i++) {
      const date = addDays(from, i);
      if (m.timeOffs.some((t) => t.date === date)) continue;
      const s = m.schedules.find((x) => x.weekday === isoWeekday(date));
      if (s) workMin += s.endMin - s.startMin;
    }
    const bookedMin = m.bookings.reduce((a, b) => a + (b.endMin - b.startMin), 0);
    return {
      id: m.id,
      name: m.name,
      nameLatin: m.nameLatin,
      specialty: m.specialty,
      color: m.color,
      bookings: m.bookings.length,
      bookedMin,
      workMin,
      load: workMin ? Math.round((bookedMin / workMin) * 100) : 0,
      revenue: m.bookings.reduce((a, b) => a + b.service.price, 0),
    };
  });
}

export async function getDashboardStats() {
  const today = todayISO();
  const weekEnd = addDays(today, 6);
  const histFrom = addDays(today, -27);
  const monthStart = today.slice(0, 8) + "01";

  const [bookings, workloadWeek, upcoming] = await Promise.all([
    prisma.booking.findMany({
      where: { date: { gte: histFrom < monthStart ? histFrom : monthStart, lte: weekEnd } },
      include: { service: true },
    }),
    getWorkload(today, weekEnd),
    prisma.booking.findMany({
      where: { date: { gte: today }, status: { in: ["confirmed", "pending"] } },
      orderBy: [{ date: "asc" }, { startMin: "asc" }],
      take: 8,
      include: { service: true, master: true },
    }),
  ]);

  const active = bookings.filter((b) => b.status !== "cancelled");
  const sum = (arr: typeof active) => arr.reduce((a, b) => a + b.service.price, 0);

  const monthDone = active.filter((b) => b.date >= monthStart && b.date <= today);
  const series = Array.from({ length: 35 }, (_, i) => {
    const date = addDays(histFrom, i);
    const day = active.filter((b) => b.date === date);
    return { date, bookings: day.length, revenue: sum(day), future: date > today };
  });

  // heatmap: weekday (1..7) × hour
  const heat: Record<string, number> = {};
  for (const b of active.filter((x) => x.date >= histFrom)) {
    const wd = isoWeekday(b.date);
    for (let h = Math.floor(b.startMin / 60); h < Math.ceil(b.endMin / 60); h++) heat[`${wd}-${h}`] = (heat[`${wd}-${h}`] ?? 0) + 1;
  }

  const sources = ["web", "bot", "ai"].map((s) => ({ source: s, count: active.filter((b) => b.source === s && b.date >= histFrom).length }));

  const weekBooked = workloadWeek.reduce((a, m) => a + m.bookedMin, 0);
  const weekWork = workloadWeek.reduce((a, m) => a + m.workMin, 0);

  return {
    today,
    kpi: {
      bookingsToday: active.filter((b) => b.date === today).length,
      bookingsWeek: active.filter((b) => b.date >= today && b.date <= weekEnd).length,
      revenueMonth: sum(monthDone),
      avgCheck: monthDone.length ? Math.round(sum(monthDone) / monthDone.length) : 0,
      loadWeek: weekWork ? Math.round((weekBooked / weekWork) * 100) : 0,
      cancelRate: bookings.length ? Math.round(((bookings.length - active.length) / bookings.length) * 100) : 0,
    },
    workloadWeek,
    series,
    heat,
    sources,
    upcoming,
  };
}

export async function getBookingsSummary(from: string, to: string) {
  const rows = await prisma.booking.findMany({
    where: { date: { gte: from, lte: to } },
    include: { service: true, master: true },
  });
  const active = rows.filter((b) => b.status !== "cancelled");
  const byService = new Map<string, { count: number; revenue: number }>();
  for (const b of active) {
    const cur = byService.get(b.service.name) ?? { count: 0, revenue: 0 };
    byService.set(b.service.name, { count: cur.count + 1, revenue: cur.revenue + b.service.price });
  }
  return {
    from,
    to,
    total: rows.length,
    cancelled: rows.length - active.length,
    revenue: active.reduce((a, b) => a + b.service.price, 0),
    bySource: Object.fromEntries(["web", "bot", "ai"].map((s) => [s, active.filter((b) => b.source === s).length])),
    byService: [...byService.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.revenue - a.revenue),
  };
}
