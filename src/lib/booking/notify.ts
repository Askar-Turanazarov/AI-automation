import type { Prisma } from "@prisma/client";
import { getDict, tpl, type Dict } from "@/i18n";
import type { Locale } from "@/i18n/config";
import { formatWhen } from "@/i18n/dates";
import { businessInfo } from "@/lib/business";
import { localizedName, localizeService } from "@/lib/i18n-data";
import { formatPriceLine } from "@/lib/money";
import { escapeHtml, sendTelegram } from "@/lib/telegram/notify";
import { telegramLocale } from "@/lib/telegram/user";
import { miniAppUrl } from "@/lib/telegram/webapp";

// Уведомления о записях в Telegram: владельцу — по-русски, клиенту — на его языке

type FullBooking = Prisma.BookingGetPayload<{ include: { master: true; service: true } }>;
type Button = { text: string; callback_data?: string; web_app?: { url: string } };
type Slot = { date: string; startMin: number; endMin: number };

const clientLine = (b: FullBooking) => `👤 ${escapeHtml(b.clientName)} · ${escapeHtml(b.phone)}`;

/** Сообщение клиенту из Telegram; по умолчанию — с кнопкой «Мои записи» в Mini App */
async function notifyClient(
  b: FullBooking,
  template: "clientBooked" | "clientRescheduled" | "reminder" | "clientCancelled" | "askRating",
  buttons?: (n: Dict["notify"], locale: Locale) => Button[][],
) {
  if (!b.tgUserId) return;
  const locale = await telegramLocale(b.tgUserId);
  const n = getDict(locale).notify;
  const text = tpl(n[template], {
    service: escapeHtml(localizeService(b.service, locale).name),
    when: formatWhen(b, locale),
    master: escapeHtml(localizedName(b.master, locale)),
    price: formatPriceLine(b.service.price, locale),
    address: escapeHtml(businessInfo(locale).address),
  });
  const appUrl = miniAppUrl(locale, "my");
  const rows = buttons ? buttons(n, locale) : appUrl ? [[{ text: n.openApp, web_app: { url: appUrl } }]] : [];
  await sendTelegram(b.tgUserId, text, rows.length ? { inline_keyboard: rows } : undefined);
}

export async function notifyNewBooking(b: FullBooking) {
  const src = { web: "🌐 сайт", bot: "🤖 бот", ai: "✨ ИИ-ассистент" }[b.source] ?? b.source;
  await sendTelegram(
    process.env.ADMIN_CHAT_ID,
    `🔥 <b>Новая запись</b> (${src})\n\n` +
      `<b>${escapeHtml(b.service.name)}</b> · ${formatPriceLine(b.service.price, "ru")}\n` +
      `🗓 ${formatWhen(b, "ru")}\n🔧 Мастер: ${escapeHtml(b.master.name)}\n` +
      clientLine(b) +
      (b.car ? `\n🚗 ${escapeHtml(b.car)}` : "") +
      (b.comment ? `\n💬 ${escapeHtml(b.comment)}` : ""),
  );
  await notifyClient(b, "clientBooked");
}

/** Владельцу — об отмене записи */
export const notifyCancelled = (b: FullBooking) =>
  sendTelegram(
    process.env.ADMIN_CHAT_ID,
    `❌ <b>Отмена записи</b>\n${escapeHtml(b.service.name)} · ${formatWhen(b, "ru")}\n${clientLine(b)}`,
  );

/** Перенос: владельцу — было и стало, клиенту — новое время */
export async function notifyRescheduled(b: FullBooking, prev: Slot) {
  await sendTelegram(
    process.env.ADMIN_CHAT_ID,
    `🔁 <b>Перенос записи</b>\n${escapeHtml(b.service.name)}\n🗓 ${formatWhen(prev, "ru")} → <b>${formatWhen(b, "ru")}</b>\n` +
      `🔧 Мастер: ${escapeHtml(b.master.name)}\n${clientLine(b)}`,
  );
  await notifyClient(b, "clientRescheduled");
}

/** Напоминание накануне: «Приду», перенос в Mini App, отмена */
export const notifyReminder = (b: FullBooking) =>
  notifyClient(b, "reminder", (n, locale) => {
    const appUrl = miniAppUrl(locale, "my");
    return [
      [{ text: n.btnComing, callback_data: `rsvp:${b.id}` }],
      [
        ...(appUrl ? [{ text: n.btnReschedule, web_app: { url: `${appUrl}&reschedule=${b.id}` } }] : []),
        { text: n.btnCancel, callback_data: `del:${b.id}` },
      ],
    ];
  });

/** Клиенту — ателье отменило запись; кнопка ведёт к новой записи в Mini App */
export const notifyCancelledByAtelier = (b: FullBooking) =>
  notifyClient(b, "clientCancelled", (n, locale) => {
    const appUrl = miniAppUrl(locale);
    return appUrl ? [[{ text: n.btnBookAgain, web_app: { url: appUrl } }]] : [];
  });

/** Клиенту — работа готова, оцените визит от 1 до 5 */
export const notifyAskRating = (b: FullBooking) =>
  notifyClient(b, "askRating", () => [[1, 2, 3, 4, 5].map((r) => ({ text: `${r}⭐`, callback_data: `rate:${b.id}:${r}` }))]);

/** Владельцу — низкая оценка: связаться с клиентом, пока недовольство не ушло в публичные отзывы */
export const notifyLowRating = (b: FullBooking, rating: number) =>
  sendTelegram(
    process.env.ADMIN_CHAT_ID,
    `⚠️ <b>Низкая оценка: ${rating}/5</b>\n${escapeHtml(b.service.name)} · ${formatWhen(b, "ru")}\n` +
      `🔧 Мастер: ${escapeHtml(b.master.name)}\n${clientLine(b)}\n\nСвяжитесь с клиентом.`,
  );

/** Владельцу — клиент нажал «Приду» */
export const notifyVisitConfirmed = (b: FullBooking) =>
  sendTelegram(
    process.env.ADMIN_CHAT_ID,
    `✅ <b>Клиент подтвердил визит</b>\n${escapeHtml(b.service.name)} · ${formatWhen(b, "ru")}\n${clientLine(b)}`,
  );
