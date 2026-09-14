import type { Prisma } from "@prisma/client";
import { getDict, tpl } from "@/i18n";
import { formatWhen } from "@/i18n/dates";
import { localizedName, localizeService } from "@/lib/i18n-data";
import { formatPriceLine } from "@/lib/money";
import { escapeHtml, sendTelegram } from "@/lib/telegram/notify";
import { telegramLocale } from "@/lib/telegram/user";
import { miniAppUrl } from "@/lib/telegram/webapp";

// Уведомления о записях в Telegram

type FullBooking = Prisma.BookingGetPayload<{ include: { master: true; service: true } }>;

export async function notifyNewBooking(b: FullBooking) {
  // владельцу — по-русски
  const src = { web: "🌐 сайт", bot: "🤖 бот", ai: "✨ ИИ-ассистент" }[b.source] ?? b.source;
  await sendTelegram(
    process.env.ADMIN_CHAT_ID,
    `🔥 <b>Новая запись</b> (${src})\n\n` +
      `<b>${escapeHtml(b.service.name)}</b> · ${formatPriceLine(b.service.price, "ru")}\n` +
      `🗓 ${formatWhen(b, "ru")}\n🔧 Мастер: ${escapeHtml(b.master.name)}\n` +
      `👤 ${escapeHtml(b.clientName)} · ${escapeHtml(b.phone)}` +
      (b.car ? `\n🚗 ${escapeHtml(b.car)}` : "") +
      (b.comment ? `\n💬 ${escapeHtml(b.comment)}` : ""),
  );
  // клиенту — на его языке
  if (b.tgUserId) {
    const locale = await telegramLocale(b.tgUserId);
    const t = getDict(locale);
    // кнопка сразу открывает «Мои записи» в Mini App
    const appUrl = miniAppUrl(locale, "my");
    await sendTelegram(
      b.tgUserId,
      tpl(t.notify.clientBooked, {
        service: escapeHtml(localizeService(b.service, locale).name),
        when: formatWhen(b, locale),
        master: escapeHtml(localizedName(b.master, locale)),
        price: formatPriceLine(b.service.price, locale),
      }),
      appUrl ? { inline_keyboard: [[{ text: t.notify.openApp, web_app: { url: appUrl } }]] } : undefined,
    );
  }
}

/** Владельцу — об отмене записи */
export const notifyCancelled = (b: FullBooking) =>
  sendTelegram(
    process.env.ADMIN_CHAT_ID,
    `❌ <b>Отмена записи</b>\n${escapeHtml(b.service.name)} · ${formatWhen(b, "ru")}\n👤 ${escapeHtml(b.clientName)} · ${escapeHtml(b.phone)}`,
  );
