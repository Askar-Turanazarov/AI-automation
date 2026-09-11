import { prisma } from "@/lib/db";
import { getAvailableDays, getDaySlots } from "@/lib/booking/availability";
import { BookingError, createBooking } from "@/lib/booking/create";
import { BUSINESS } from "@/lib/business";
import { getBookingsSummary, getDashboardStats, getWorkload } from "@/lib/stats";
import { addDays, formatDateRu, hhmmToMin, minToHHMM, todayISO } from "@/lib/time";
import type { ToolDef } from "./types";

const str = (description: string) => ({ type: "string", description });
const int = (description: string) => ({ type: "integer", description });
const DATE = "Дата в формате YYYY-MM-DD";

export const consultantTools: ToolDef[] = [
  {
    name: "get_business_info",
    description: "Адрес, часы работы, контакты и гарантия ателье.",
    parameters: { type: "object", properties: {} },
    run: async () => BUSINESS,
  },
  {
    name: "get_services",
    description: "Список услуг: id, название, категория, длительность (мин), цена (тенге), описание и мастера.",
    parameters: { type: "object", properties: {} },
    run: async () =>
      (
        await prisma.service.findMany({
          where: { active: true },
          include: { masters: { include: { master: true } } },
          orderBy: { category: "asc" },
        })
      ).map((s) => ({
        id: s.id,
        name: s.name,
        category: s.category,
        durationMin: s.durationMin,
        price: s.price,
        description: s.description,
        masters: s.masters.filter((m) => m.master.active).map((m) => ({ id: m.master.id, name: m.master.name })),
      })),
  },
  {
    name: "get_masters",
    description: "Мастера ателье: id, имя, специализация, описание, услуги.",
    parameters: { type: "object", properties: {} },
    run: async () =>
      (
        await prisma.master.findMany({ where: { active: true }, include: { services: { include: { service: true } } } })
      ).map((m) => ({ id: m.id, name: m.name, specialty: m.specialty, bio: m.bio, services: m.services.map((s) => s.service.name) })),
  },
  {
    name: "get_available_days",
    description: "Дни, в которые есть свободное время на услугу (опционально у конкретного мастера). Возвращает до 14 дней.",
    parameters: {
      type: "object",
      properties: { serviceId: str("id услуги"), masterId: str("id мастера, если клиент хочет конкретного"), from: str(`${DATE}; по умолчанию сегодня`) },
      required: ["serviceId"],
    },
    run: async (a) => {
      const days = await getAvailableDays({ serviceId: String(a.serviceId), masterId: (a.masterId as string) || null, from: (a.from as string) || todayISO(), days: 14 });
      if (!days) return { error: "Услуга не найдена" };
      return days.filter((d) => d.slots > 0).map((d) => ({ date: d.date, label: formatDateRu(d.date), freeSlots: d.slots }));
    },
  },
  {
    name: "get_available_slots",
    description: "Свободное время начала на конкретную дату и мастера, доступные в каждое время.",
    parameters: {
      type: "object",
      properties: { serviceId: str("id услуги"), date: str(DATE), masterId: str("id мастера (опционально)") },
      required: ["serviceId", "date"],
    },
    run: async (a) => {
      const day = await getDaySlots({ serviceId: String(a.serviceId), date: String(a.date), masterId: (a.masterId as string) || null });
      if (!day) return { error: "Услуга не найдена" };
      const names = Object.fromEntries(day.masters.map((m) => [m.id, m.name]));
      return {
        date: day.date,
        label: formatDateRu(day.date),
        service: day.service.name,
        slots: day.slots.map((s) => ({ time: minToHHMM(s.time), masters: s.masterIds.map((id) => ({ id, name: names[id] })) })),
      };
    },
  },
  {
    name: "create_booking",
    description:
      "Создать запись. Вызывай ТОЛЬКО после того, как клиент явно подтвердил итоговые данные (услуга, дата, время, мастер, имя, телефон).",
    parameters: {
      type: "object",
      properties: {
        serviceId: str("id услуги"),
        masterId: str("id мастера; пусто — любой свободный"),
        date: str(DATE),
        time: str("Время начала HH:MM"),
        clientName: str("Имя клиента"),
        phone: str("Телефон клиента"),
        car: str("Марка и модель авто"),
        comment: str("Пожелания клиента"),
      },
      required: ["serviceId", "date", "time", "clientName", "phone"],
    },
    run: async (a, ctx) => {
      const startMin = hhmmToMin(String(a.time));
      const dup = await prisma.booking.findFirst({
        where: { serviceId: String(a.serviceId), date: String(a.date), startMin, phone: String(a.phone), status: { not: "cancelled" } },
        include: { master: true },
      });
      if (dup) return { ok: true, alreadyExists: true, bookingId: dup.id, master: dup.master.name };
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
        return { ok: true, bookingId: b.id, service: b.service.name, master: b.master.name, when: `${formatDateRu(b.date)} ${minToHHMM(b.startMin)}–${minToHHMM(b.endMin)}`, price: b.service.price };
      } catch (e) {
        if (e instanceof BookingError) return { ok: false, error: e.message };
        if (e && typeof e === "object" && "issues" in e) return { ok: false, error: "Некорректные данные: проверьте имя и телефон" };
        throw e;
      }
    },
  },
];

const range = { from: str(DATE), to: str(DATE) };

export const analystTools: ToolDef[] = [
  {
    name: "get_dashboard",
    description: "KPI ателье: записи сегодня/неделя, выручка месяца, средний чек, загрузка недели, % отмен, загрузка мастеров, ближайшие записи.",
    parameters: { type: "object", properties: {} },
    run: async () => {
      const s = await getDashboardStats();
      return { today: s.today, kpi: s.kpi, workloadWeek: s.workloadWeek, sources: s.sources, upcoming: s.upcoming.map((b) => ({ date: b.date, time: minToHHMM(b.startMin), service: b.service.name, master: b.master.name, client: b.clientName })) };
    },
  },
  {
    name: "get_workload",
    description: "Загрузка каждого мастера за период: забронированные/рабочие минуты, %, число записей, выручка.",
    parameters: { type: "object", properties: range, required: ["from", "to"] },
    run: async (a) => getWorkload(String(a.from), String(a.to)),
  },
  {
    name: "get_bookings_summary",
    description: "Сводка записей за период: всего, отмены, выручка, по источникам (сайт/бот/ИИ) и по услугам.",
    parameters: { type: "object", properties: range, required: ["from", "to"] },
    run: async (a) => getBookingsSummary(String(a.from), String(a.to)),
  },
  {
    name: "list_bookings",
    description: "Все записи на конкретную дату.",
    parameters: { type: "object", properties: { date: str(DATE) }, required: ["date"] },
    run: async (a) =>
      (
        await prisma.booking.findMany({ where: { date: String(a.date) }, include: { service: true, master: true }, orderBy: { startMin: "asc" } })
      ).map((b) => ({ time: `${minToHHMM(b.startMin)}–${minToHHMM(b.endMin)}`, service: b.service.name, master: b.master.name, client: b.clientName, car: b.car, status: b.status, source: b.source, price: b.service.price })),
  },
  {
    name: "shift_date",
    description: "Вычислить дату со сдвигом в днях от заданной.",
    parameters: { type: "object", properties: { date: str(DATE), days: int("сдвиг, может быть отрицательным") }, required: ["date", "days"] },
    run: async (a) => ({ date: addDays(String(a.date), Number(a.days)) }),
  },
];
