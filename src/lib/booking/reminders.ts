import { prisma } from "@/lib/db";
import { addDays, todayISO } from "@/lib/time";
import { notifyReminder, notifyVisitConfirmed } from "./notify";
import { UPCOMING_STATUSES, type BookingStatus } from "./status";

const include = { master: true, service: true } as const;

/** Cron раз в день: напоминание клиентам из Telegram о завтрашних записях — одно на запись */
export async function sendReminders() {
  const list = await prisma.booking.findMany({
    where: { date: addDays(todayISO(), 1), status: { in: UPCOMING_STATUSES }, tgUserId: { not: null }, remindedAt: null },
    include,
  });
  for (const b of list) {
    await notifyReminder(b).catch((e) => console.error("[reminders]", b.id, e));
    // помечаем даже при сбое отправки — чтобы не засыпать клиента повторами
    await prisma.booking.update({ where: { id: b.id }, data: { remindedAt: new Date() } });
  }
  return list.length;
}

/** Кнопка «Приду» из напоминания: только своя предстоящая запись */
export async function confirmVisit(id: string, tgUserId: string) {
  const b = await prisma.booking.findUnique({ where: { id }, include });
  if (!b || b.tgUserId !== tgUserId || !UPCOMING_STATUSES.includes(b.status as BookingStatus)) return false;
  await prisma.booking.update({ where: { id }, data: { confirmedAt: new Date() } });
  await notifyVisitConfirmed(b).catch((e) => console.error("[telegram] visit confirm notify failed", e));
  return true;
}
