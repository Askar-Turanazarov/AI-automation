import { z } from "zod";
import { prisma } from "@/lib/db";
import { getDaySlots } from "./availability";
import { BookingError } from "./errors";
import { notifyCancelled, notifyNewBooking } from "./notify";
import { BOOKING_SOURCES, NOT_CANCELLED } from "./status";

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

export async function createBooking(raw: BookingInput) {
  const input = bookingInput.parse(raw);
  const day = await getDaySlots({ serviceId: input.serviceId, date: input.date, masterId: input.masterId });
  if (!day) throw new BookingError("service_not_found");
  const slot = day.slots.find((s) => s.time === input.startMin);
  if (!slot) throw new BookingError("slot_taken");

  // «Любой мастер» → самый свободный в этот день
  const masterId =
    input.masterId ??
    [...slot.masterIds].sort(
      (a, b) => (day.masters.find((m) => m.id === b)?.slots.length ?? 0) - (day.masters.find((m) => m.id === a)?.slots.length ?? 0),
    )[0];

  const endMin = input.startMin + day.service.durationMin;

  const booking = await prisma.$transaction(async (tx) => {
    const clash = await tx.booking.findFirst({
      where: { masterId, date: input.date, status: NOT_CANCELLED, startMin: { lt: endMin }, endMin: { gt: input.startMin } },
    });
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

  void notifyNewBooking(booking).catch((e) => console.error("[telegram] booking notify failed", e));
  return booking;
}

export async function cancelBooking(id: string, tgUserId?: string) {
  const b = await prisma.booking.findUnique({ where: { id }, include: { master: true, service: true } });
  if (!b || (tgUserId && b.tgUserId !== tgUserId)) throw new BookingError("not_found");
  const updated = await prisma.booking.update({ where: { id }, data: { status: "cancelled" }, include: { master: true, service: true } });
  void notifyCancelled(b);
  return updated;
}
