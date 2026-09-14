import { getDict } from "@/i18n";
import { formatDate } from "@/i18n/dates";
import { getAvailableDays, getDaySlots } from "@/lib/booking/availability";
import { createBooking } from "@/lib/booking/create";
import { BookingError } from "@/lib/booking/errors";
import { businessInfo } from "@/lib/business";
import { prisma } from "@/lib/db";
import { localizedName, localizeMaster, localizeService } from "@/lib/i18n-data";
import { formatPriceLine, toUSD } from "@/lib/money";
import { getBookingsSummary, getDashboardStats, getWorkload } from "@/lib/stats";
import { addDays, hhmmToMin, minToHHMM, todayISO } from "@/lib/time";
import type { Locale } from "@/i18n/config";
import type { ToolDef } from "./types";

const str = (description: string) => ({ type: "string", description });
const int = (description: string) => ({ type: "integer", description });
const DATE = "Date in YYYY-MM-DD format";

const price = (uzs: number, locale: Locale) => ({ uzs, usd: Math.round(toUSD(uzs)), formatted: formatPriceLine(uzs, locale) });

export const consultantTools: ToolDef[] = [
  {
    name: "get_business_info",
    description: "Address, opening hours, contacts and warranty of the atelier.",
    parameters: { type: "object", properties: {} },
    run: async (_a, ctx) => businessInfo(ctx.locale),
  },
  {
    name: "get_services",
    description: "All services: id, name, category, duration (minutes), price (UZS + approx USD), description and specialists.",
    parameters: { type: "object", properties: {} },
    run: async (_a, ctx) =>
      (
        await prisma.service.findMany({ where: { active: true }, include: { masters: { include: { master: true } } }, orderBy: { category: "asc" } })
      ).map((raw) => {
        const s = localizeService(raw, ctx.locale);
        return {
          id: s.id,
          name: s.name,
          category: s.category,
          durationMin: s.durationMin,
          price: price(s.price, ctx.locale),
          description: s.description,
          masters: raw.masters.filter((m) => m.master.active).map((m) => ({ id: m.master.id, name: localizedName(m.master, ctx.locale) })),
        };
      }),
  },
  {
    name: "get_masters",
    description: "Specialists: id, name, specialty, bio and services.",
    parameters: { type: "object", properties: {} },
    run: async (_a, ctx) =>
      (await prisma.master.findMany({ where: { active: true }, include: { services: { include: { service: true } } } })).map((raw) => {
        const m = localizeMaster(raw, ctx.locale);
        return { id: m.id, name: m.name, specialty: m.specialty, bio: m.bio, services: raw.services.map((s) => localizeService(s.service, ctx.locale).name) };
      }),
  },
  {
    name: "get_available_days",
    description: "Days with free time for a service (optionally with a specific specialist). Returns up to 14 days.",
    parameters: {
      type: "object",
      properties: { serviceId: str("service id"), masterId: str("specialist id, if the client wants a specific one"), from: str(`${DATE}; defaults to today`) },
      required: ["serviceId"],
    },
    run: async (a, ctx) => {
      const days = await getAvailableDays({ serviceId: String(a.serviceId), masterId: (a.masterId as string) || null, from: (a.from as string) || todayISO(), days: 14 });
      if (!days) return { error: getDict(ctx.locale).errors.service_not_found };
      return days.filter((d) => d.slots > 0).map((d) => ({ date: d.date, label: formatDate(d.date, ctx.locale), freeSlots: d.slots }));
    },
  },
  {
    name: "get_available_slots",
    description: "Free start times on a given date and which specialists are free at each time.",
    parameters: {
      type: "object",
      properties: { serviceId: str("service id"), date: str(DATE), masterId: str("specialist id (optional)") },
      required: ["serviceId", "date"],
    },
    run: async (a, ctx) => {
      const day = await getDaySlots({ serviceId: String(a.serviceId), date: String(a.date), masterId: (a.masterId as string) || null });
      if (!day) return { error: getDict(ctx.locale).errors.service_not_found };
      const names = Object.fromEntries(
        (await prisma.master.findMany({ where: { id: { in: day.masters.map((m) => m.id) } } })).map((m) => [m.id, localizedName(m, ctx.locale)]),
      );
      return {
        date: day.date,
        label: formatDate(day.date, ctx.locale),
        service: localizeService(day.service, ctx.locale).name,
        slots: day.slots.map((s) => ({ time: minToHHMM(s.time), masters: s.masterIds.map((id) => ({ id, name: names[id] })) })),
      };
    },
  },
  {
    name: "create_booking",
    description:
      "Create a booking. Call it ONLY after the client has explicitly confirmed the final details (service, date, time, specialist, name, phone).",
    parameters: {
      type: "object",
      properties: {
        serviceId: str("service id"),
        masterId: str("specialist id; empty = any available"),
        date: str(DATE),
        time: str("Start time HH:MM"),
        clientName: str("Client's name"),
        phone: str("Client's phone number"),
        car: str("Car make and model"),
        comment: str("Client's wishes"),
      },
      required: ["serviceId", "date", "time", "clientName", "phone"],
    },
    run: async (a, ctx) => {
      const t = getDict(ctx.locale);
      const startMin = hhmmToMin(String(a.time));
      const dup = await prisma.booking.findFirst({
        where: { serviceId: String(a.serviceId), date: String(a.date), startMin, phone: String(a.phone), status: { not: "cancelled" } },
        include: { master: true },
      });
      if (dup) return { ok: true, alreadyExists: true, bookingId: dup.id, master: localizedName(dup.master, ctx.locale) };
      if (ctx.tgUserId) await prisma.telegramUser.upsert({ where: { id: ctx.tgUserId }, create: { id: ctx.tgUserId, locale: ctx.locale }, update: {} });
      try {
        const b = await createBooking({
          serviceId: String(a.serviceId),
          masterId: (a.masterId as string) || null,
          date: String(a.date),
          startMin,
          clientName: String(a.clientName),
          phone: String(a.phone),
          car: (a.car as string) || "",
          comment: (a.comment as string) || "",
          source: "ai",
          tgUserId: ctx.tgUserId ?? null,
        });
        return {
          ok: true,
          bookingId: b.id,
          service: localizeService(b.service, ctx.locale).name,
          master: localizedName(b.master, ctx.locale),
          when: `${formatDate(b.date, ctx.locale)} ${minToHHMM(b.startMin)}–${minToHHMM(b.endMin)}`,
          price: price(b.service.price, ctx.locale),
        };
      } catch (e) {
        if (e instanceof BookingError) return { ok: false, error: t.errors[e.code] };
        if (e && typeof e === "object" && "issues" in e) return { ok: false, error: t.errors.invalid };
        throw e;
      }
    },
  },
];

const range = { from: str(DATE), to: str(DATE) };

export const analystTools: ToolDef[] = [
  {
    name: "get_dashboard",
    description: "Key metrics: bookings today / next 7 days, month-to-date revenue (UZS), average ticket, 7-day utilization, cancellation rate, per-specialist utilization, upcoming bookings.",
    parameters: { type: "object", properties: {} },
    run: async (_a, ctx) => {
      const s = await getDashboardStats();
      return {
        today: s.today,
        currency: "UZS",
        kpi: s.kpi,
        workloadWeek: s.workloadWeek.map((w) => ({ ...w, name: localizedName(w, ctx.locale) })),
        sources: s.sources,
        upcoming: s.upcoming.map((b) => ({ date: b.date, time: minToHHMM(b.startMin), service: localizeService(b.service, ctx.locale).name, master: localizedName(b.master, ctx.locale), client: b.clientName })),
      };
    },
  },
  {
    name: "get_workload",
    description: "Utilization of each specialist over a period: booked/working minutes, %, number of bookings, revenue (UZS).",
    parameters: { type: "object", properties: range, required: ["from", "to"] },
    run: async (a, ctx) => (await getWorkload(String(a.from), String(a.to))).map((w) => ({ ...w, name: localizedName(w, ctx.locale) })),
  },
  {
    name: "get_bookings_summary",
    description: "Bookings summary for a period: total, cancellations, revenue (UZS), by source (website/bot/AI) and by service.",
    parameters: { type: "object", properties: range, required: ["from", "to"] },
    run: async (a) => getBookingsSummary(String(a.from), String(a.to)),
  },
  {
    name: "list_bookings",
    description: "All bookings on a specific date.",
    parameters: { type: "object", properties: { date: str(DATE) }, required: ["date"] },
    run: async (a, ctx) =>
      (
        await prisma.booking.findMany({ where: { date: String(a.date) }, include: { service: true, master: true }, orderBy: { startMin: "asc" } })
      ).map((b) => ({
        time: `${minToHHMM(b.startMin)}–${minToHHMM(b.endMin)}`,
        service: localizeService(b.service, ctx.locale).name,
        master: localizedName(b.master, ctx.locale),
        client: b.clientName,
        car: b.car,
        status: b.status,
        source: b.source,
        priceUzs: b.service.price,
      })),
  },
  {
    name: "shift_date",
    description: "Compute a date shifted by a number of days.",
    parameters: { type: "object", properties: { date: str(DATE), days: int("shift, may be negative") }, required: ["date", "days"] },
    run: async (a) => ({ date: addDays(String(a.date), Number(a.days)) }),
  },
];
