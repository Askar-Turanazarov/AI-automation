import { prisma } from "@/lib/db";
import { addDays, isoWeekday, nowMinutes, todayISO } from "@/lib/time";
import { computeFreeStarts } from "./slots";

export const MAX_DAYS_AHEAD = 60;
/** Минимальный запас до начала записи на сегодня */
const LEAD_MIN = 30;

async function loadContext(serviceId: string, from: string, to: string, masterId?: string | null) {
  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service || !service.active) return null;
  const masters = await prisma.master.findMany({
    where: { active: true, ...(masterId ? { id: masterId } : {}), services: { some: { serviceId } } },
    orderBy: { createdAt: "asc" },
    include: {
      schedules: true,
      timeOffs: { where: { date: { gte: from, lte: to } } },
      bookings: {
        where: { date: { gte: from, lte: to }, status: { not: "cancelled" } },
        select: { date: true, startMin: true, endMin: true },
      },
    },
  });
  return { service, masters };
}

type Ctx = NonNullable<Awaited<ReturnType<typeof loadContext>>>;

function freeStartsFor(master: Ctx["masters"][number], date: string, duration: number) {
  const today = todayISO();
  if (date < today || date > addDays(today, MAX_DAYS_AHEAD)) return [];
  if (master.timeOffs.some((t) => t.date === date)) return [];
  const sch = master.schedules.find((s) => s.weekday === isoWeekday(date));
  return computeFreeStarts({
    work: sch ? { start: sch.startMin, end: sch.endMin } : null,
    busy: master.bookings.filter((b) => b.date === date).map((b) => ({ start: b.startMin, end: b.endMin })),
    duration,
    notBefore: date === today ? nowMinutes() + LEAD_MIN : -1,
  });
}

export async function getDaySlots(p: { serviceId: string; date: string; masterId?: string | null }) {
  const ctx = await loadContext(p.serviceId, p.date, p.date, p.masterId);
  if (!ctx) return null;
  const byTime = new Map<number, string[]>();
  const masters = ctx.masters.map((m) => {
    const slots = freeStartsFor(m, p.date, ctx.service.durationMin);
    for (const t of slots) byTime.set(t, [...(byTime.get(t) ?? []), m.id]);
    return { id: m.id, name: m.name, nameLatin: m.nameLatin, specialty: m.specialty, photoUrl: m.photoUrl, color: m.color, slots };
  });
  const slots = [...byTime.entries()].sort((a, b) => a[0] - b[0]).map(([time, masterIds]) => ({ time, masterIds }));
  return { service: ctx.service, date: p.date, slots, masters };
}

export async function getAvailableDays(p: { serviceId: string; from: string; days: number; masterId?: string | null }) {
  const days = Math.min(Math.max(p.days, 1), MAX_DAYS_AHEAD + 1);
  const ctx = await loadContext(p.serviceId, p.from, addDays(p.from, days - 1), p.masterId);
  if (!ctx) return null;
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(p.from, i);
    const times = new Set<number>();
    for (const m of ctx.masters) for (const t of freeStartsFor(m, date, ctx.service.durationMin)) times.add(t);
    return { date, slots: times.size };
  });
}
