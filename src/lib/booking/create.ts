import { z } from "zod";
import { prisma } from "@/lib/db";
import { getDaySlots } from "./availability";
import { BookingError } from "./errors";
import { notifyCancelled, notifyNewBooking, notifyRescheduled } from "./notify";
import { BOOKING_SOURCES, NOT_CANCELLED, UPCOMING_STATUSES, type BookingStatus } from "./status";

export const bookingInput = z.object({
  serviceId: z.string().min(1),
  masterId: z.string().min(1).nullish(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startMin: z.number().int().min(0).max(1439),
  clientName: z.string().trim().min(2).max(60),
  phone: z
    .string()
    .trim()
    .regex(/^[+\d][\d\s()-]{5,20}$/),
  car: z.string().trim().max(80).default(""),
  comment: z.string().trim().max(500).default(""),
  source: z.enum(BOOKING_SOURCES).default("web"),
  tgUserId: z.string().nullish(),
});

export type BookingInput = z.input<typeof bookingInput>;

export const rescheduleInput = bookingInput.pick({ date: true, startMin: true, masterId: true });

type Day = NonNullable<Awaited<ReturnType<typeof getDaySlots>>>;

/** «Любой мастер» → самый свободный в этот день из свободных в выбранное время */
const freestMaster = (day: Day, masterIds: string[]) =>
  [...masterIds].sort(
    (a, b) => (day.masters.find((m) => m.id === b)?.slots.length ?? 0) - (day.masters.find((m) => m.id === a)?.slots.length ?? 0),
  )[0];

/** Условие пересечения с активной записью мастера */
const clashWhere = (masterId: string, date: string, startMin: number, endMin: number) => ({
  masterId,
  date,
  status: NOT_CANCELLED,
  startMin: { lt: endMin },
  endMin: { gt: startMin },
});

export async function createBooking(raw: BookingInput) {
  const input = bookingInput.parse(raw);
  const day = await getDaySlots({ serviceId: input.serviceId, date: input.date, masterId: input.masterId });
  if (!day) throw new BookingError("service_not_found");
  const slot = day.slots.find((s) => s.time === input.startMin);
  if (!slot) throw new BookingError("slot_taken");

  const masterId = input.masterId ?? freestMaster(day, slot.masterIds);
  const endMin = input.startMin + day.service.durationMin;

  const booking = await prisma.$transaction(async (tx) => {
    const clash = await tx.booking.findFirst({ where: clashWhere(masterId, input.date, input.startMin, endMin) });
    if (clash) throw new BookingError("slot_just_taken");
    return tx.booking.create({
      data: {
        masterId,
        serviceId: input.serviceId,
        date: input.date,
        startMin: input.startMin,
        endMin,
        clientName: input.clientName,
        phone: input.phone,
        car: input.car,
        comment: input.comment,
        source: input.source,
        tgUserId: input.tgUserId ?? null,
        status: "confirmed",
      },
      include: { master: true, service: true },
    });
  });

  // ждём отправку: на serverless фоновый запрос после ответа может не выполниться
  await notifyNewBooking(booking).catch((e) => console.error("[telegram] booking notify failed", e));
  return booking;
}

/** Перенос своей записи из Telegram: те же проверки свободного времени, сама запись пересечением не считается */
export async function rescheduleBooking(id: string, tgUserId: string, raw: z.input<typeof rescheduleInput>) {
  const input = rescheduleInput.parse(raw);
  const prev = await prisma.booking.findUnique({ where: { id } });
  if (!prev || prev.tgUserId !== tgUserId || !UPCOMING_STATUSES.includes(prev.status as BookingStatus)) {
    throw new BookingError("not_found");
  }
  const day = await getDaySlots({ serviceId: prev.serviceId, date: input.date, masterId: input.masterId });
  if (!day) throw new BookingError("service_not_found");
  const slot = day.slots.find((s) => s.time === input.startMin);
  if (!slot) throw new BookingError("slot_taken");

  const masterId = input.masterId ?? freestMaster(day, slot.masterIds);
  const endMin = input.startMin + day.service.durationMin;

  const booking = await prisma.$transaction(async (tx) => {
    const clash = await tx.booking.findFirst({ where: { id: { not: id }, ...clashWhere(masterId, input.date, input.startMin, endMin) } });
    if (clash) throw new BookingError("slot_just_taken");
    // новое время — напоминание и подтверждение визита заново
    return tx.booking.update({
      where: { id },
      data: { masterId, date: input.date, startMin: input.startMin, endMin, remindedAt: null, confirmedAt: null },
      include: { master: true, service: true },
    });
  });

  await notifyRescheduled(booking, prev).catch((e) => console.error("[telegram] reschedule notify failed", e));
  return booking;
}

export async function cancelBooking(id: string, tgUserId?: string) {
  const b = await prisma.booking.findUnique({ where: { id }, include: { master: true, service: true } });
  if (!b || (tgUserId && b.tgUserId !== tgUserId)) throw new BookingError("not_found");
  const updated = await prisma.booking.update({ where: { id }, data: { status: "cancelled" }, include: { master: true, service: true } });
  await notifyCancelled(b).catch((e) => console.error("[telegram] cancel notify failed", e));
  return updated;
}
