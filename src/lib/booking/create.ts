import { z } from "zod";
import { getDict, tpl } from "@/i18n";
import { isLocale, type Locale } from "@/i18n/config";
import { formatDate } from "@/i18n/dates";
import { prisma } from "@/lib/db";
import { localizedName, localizeService } from "@/lib/i18n-data";
import { formatPriceLine } from "@/lib/money";
import { escapeHtml, sendTelegram } from "@/lib/telegram/notify";
import { minToHHMM } from "@/lib/time";
import { getDaySlots } from "./availability";
import { BookingError } from "./errors";

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
  source: z.enum(["web", "bot", "ai"]).default("web"),
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
      (a, b) =>
        (day.masters.find((m) => m.id === b)?.slots.length ?? 0) -
        (day.masters.find((m) => m.id === a)?.slots.length ?? 0),
    )[0];

  const endMin = input.startMin + day.service.durationMin;

  const booking = await prisma.$transaction(async (tx) => {
    const clash = await tx.booking.findFirst({
      where: { masterId, date: input.date, status: { not: "cancelled" }, startMin: { lt: endMin }, endMin: { gt: input.startMin } },
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

type FullBooking = Awaited<ReturnType<typeof createBooking>>;

export const bookingWhen = (b: { date: string; startMin: number; endMin: number }, locale: Locale) =>
  `${formatDate(b.date, locale)}, ${minToHHMM(b.startMin)}–${minToHHMM(b.endMin)}`;

export async function telegramLocale(tgUserId?: string | null): Promise<Locale> {
  if (!tgUserId) return "ru";
  const u = await prisma.telegramUser.findUnique({ where: { id: tgUserId } });
  return isLocale(u?.locale) ? u.locale : "ru";
}

async function notifyNewBooking(b: FullBooking) {
  // владельцу — по-русски
  const src = { web: "🌐 сайт", bot: "🤖 бот", ai: "✨ ИИ-ассистент" }[b.source] ?? b.source;
  await sendTelegram(
    process.env.ADMIN_CHAT_ID,
    `🔥 <b>Новая запись</b> (${src})\n\n` +
      `<b>${escapeHtml(b.service.name)}</b> · ${formatPriceLine(b.service.price, "ru")}\n` +
      `🗓 ${bookingWhen(b, "ru")}\n🔧 Мастер: ${escapeHtml(b.master.name)}\n` +
      `👤 ${escapeHtml(b.clientName)} · ${escapeHtml(b.phone)}` +
      (b.car ? `\n🚗 ${escapeHtml(b.car)}` : "") +
      (b.comment ? `\n💬 ${escapeHtml(b.comment)}` : ""),
  );
  // клиенту — на его языке
  if (b.tgUserId) {
    const locale = await telegramLocale(b.tgUserId);
    const t = getDict(locale);
    await sendTelegram(
      b.tgUserId,
      tpl(t.notify.clientBooked, {
        service: escapeHtml(localizeService(b.service, locale).name),
        when: bookingWhen(b, locale),
        master: escapeHtml(localizedName(b.master, locale)),
        price: formatPriceLine(b.service.price, locale),
      }),
    );
  }
}

export async function cancelBooking(id: string, tgUserId?: string) {
  const b = await prisma.booking.findUnique({ where: { id }, include: { master: true, service: true } });
  if (!b || (tgUserId && b.tgUserId !== tgUserId)) throw new BookingError("not_found");
  const updated = await prisma.booking.update({ where: { id }, data: { status: "cancelled" }, include: { master: true, service: true } });
  void sendTelegram(
    process.env.ADMIN_CHAT_ID,
    `❌ <b>Отмена записи</b>\n${escapeHtml(b.service.name)} · ${bookingWhen(b, "ru")}\n👤 ${escapeHtml(b.clientName)} · ${escapeHtml(b.phone)}`,
  );
  return updated;
}
