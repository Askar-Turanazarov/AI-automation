import { z } from "zod";
import { prisma } from "@/lib/db";
import { escapeHtml, sendTelegram } from "@/lib/telegram/notify";
import { formatDateRu, formatPrice, minToHHMM } from "@/lib/time";
import { getDaySlots } from "./availability";

export const bookingInput = z.object({
  serviceId: z.string().min(1),
  masterId: z.string().min(1).nullish(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startMin: z.number().int().min(0).max(1439),
  clientName: z.string().trim().min(2, "Укажите имя").max(60),
  phone: z
    .string()
    .trim()
    .regex(/^[+\d][\d\s()-]{5,20}$/, "Некорректный телефон"),
  car: z.string().trim().max(80).default(""),
  comment: z.string().trim().max(500).default(""),
  source: z.enum(["web", "bot", "ai"]).default("web"),
  tgUserId: z.string().nullish(),
});

export type BookingInput = z.input<typeof bookingInput>;

export class BookingError extends Error {}

export async function createBooking(raw: BookingInput) {
  const input = bookingInput.parse(raw);
  const day = await getDaySlots({ serviceId: input.serviceId, date: input.date, masterId: input.masterId });
  if (!day) throw new BookingError("Услуга не найдена");
  const slot = day.slots.find((s) => s.time === input.startMin);
  if (!slot) throw new BookingError("Это время уже занято — выберите другое");

  // «Любой мастер» → самый свободный в этот день
  const masterId =
    input.masterId ??
    [...slot.masterIds].sort(
      (a, b) =>
        (day.masters.find((m) => m.id === b)?.slots.length ?? 0) -
        (day.masters.find((m) => m.id === a)?.slots.length ?? 0),
    )[0];

  const endMin = input.startMin + day.service.durationMin;

  const booking = await prisma.$transaction(async (tx) => {
    const clash = await tx.booking.findFirst({
      where: { masterId, date: input.date, status: { not: "cancelled" }, startMin: { lt: endMin }, endMin: { gt: input.startMin } },
    });
    if (clash) throw new BookingError("Это время только что заняли — выберите другое");
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

  void notifyNewBooking(booking);
  return booking;
}

type FullBooking = Awaited<ReturnType<typeof createBooking>>;

export function bookingSummary(b: FullBooking) {
  return `${formatDateRu(b.date)}, ${minToHHMM(b.startMin)}–${minToHHMM(b.endMin)}`;
}

async function notifyNewBooking(b: FullBooking) {
  const src = { web: "🌐 сайт", bot: "🤖 бот", ai: "✨ ИИ-ассистент" }[b.source] ?? b.source;
  await sendTelegram(
    process.env.ADMIN_CHAT_ID,
    `🔥 <b>Новая запись</b> (${src})\n\n` +
      `<b>${escapeHtml(b.service.name)}</b> · ${formatPrice(b.service.price)}\n` +
      `🗓 ${bookingSummary(b)}\n🔧 Мастер: ${escapeHtml(b.master.name)}\n` +
      `👤 ${escapeHtml(b.clientName)} · ${escapeHtml(b.phone)}` +
      (b.car ? `\n🚗 ${escapeHtml(b.car)}` : "") +
      (b.comment ? `\n💬 ${escapeHtml(b.comment)}` : ""),
  );
  if (b.tgUserId) {
    await sendTelegram(
      b.tgUserId,
      `✅ <b>Вы записаны в Octane Forge</b>\n\n${escapeHtml(b.service.name)}\n🗓 ${bookingSummary(b)}\n🔧 Мастер: ${escapeHtml(b.master.name)}\n\nЖдём вас! Отменить запись можно в меню «Мои записи».`,
    );
  }
}

export async function cancelBooking(id: string, tgUserId?: string) {
  const b = await prisma.booking.findUnique({ where: { id }, include: { master: true, service: true } });
  if (!b || (tgUserId && b.tgUserId !== tgUserId)) throw new BookingError("Запись не найдена");
  const updated = await prisma.booking.update({ where: { id }, data: { status: "cancelled" }, include: { master: true, service: true } });
  void sendTelegram(
    process.env.ADMIN_CHAT_ID,
    `❌ <b>Отмена записи</b>\n${escapeHtml(b.service.name)} · ${bookingSummary(updated)}\n👤 ${escapeHtml(b.clientName)} · ${escapeHtml(b.phone)}`,
  );
  return updated;
}
