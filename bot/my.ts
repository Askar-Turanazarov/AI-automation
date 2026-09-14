import { InlineKeyboard, type Bot, type Context } from "grammy";
import { tpl } from "../src/i18n";
import { formatDate } from "../src/i18n/dates";
import { cancelBooking } from "../src/lib/booking/create";
import { confirmVisit } from "../src/lib/booking/reminders";
import { UPCOMING_STATUSES } from "../src/lib/booking/status";
import { prisma } from "../src/lib/db";
import { localizedName, localizeService } from "../src/lib/i18n-data";
import { escapeHtml } from "../src/lib/telegram/notify";
import { minToHHMM, todayISO } from "../src/lib/time";
import { allLabels, i18n } from "./locale";
import { edit, miniAppUrl } from "./ui";

// ---------- мои записи ----------
async function showMy(ctx: Context) {
  const { locale, b } = await i18n(ctx);
  const appUrl = miniAppUrl(locale, "my");
  const list = await prisma.booking.findMany({
    where: { tgUserId: String(ctx.from!.id), date: { gte: todayISO() }, status: { in: UPCOMING_STATUSES } },
    include: { service: true, master: true },
    orderBy: [{ date: "asc" }, { startMin: "asc" }],
  });
  if (!list.length) {
    const kb = new InlineKeyboard().text(b.btnBook, "back:svc");
    if (appUrl) kb.row().webApp(b.openApp, appUrl);
    return edit(ctx, b.noBookings, kb);
  }
  const kb = new InlineKeyboard();
  const text = list
    .map((bk, i) => {
      kb.text(tpl(b.cancelN, { n: i + 1 }), `del:${bk.id}`).row();
      return `<b>${i + 1}. ${escapeHtml(localizeService(bk.service, locale).name)}</b>\n🗓 ${formatDate(bk.date, locale)}, ${minToHHMM(bk.startMin)} · ${escapeHtml(localizedName(bk.master, locale))}`;
    })
    .join("\n\n");
  if (appUrl) kb.webApp(b.openApp, appUrl);
  await edit(ctx, `${b.myTitle}\n\n${text}`, kb);
}

export function registerMy(bot: Bot) {
  bot.command("my", showMy);
  bot.hears(allLabels("btnMy"), showMy);

  // «Приду» из напоминания накануне
  bot.callbackQuery(/^rsvp:(.+)$/, async (ctx) => {
    const { b } = await i18n(ctx);
    const confirmed = await confirmVisit(ctx.match[1], String(ctx.from.id));
    await ctx.answerCallbackQuery({ text: confirmed ? b.rsvpThanks : b.rsvpFailed });
    if (confirmed) await ctx.editMessageReplyMarkup().catch(() => {});
  });

  bot.callbackQuery(/^del:(.+)$/, async (ctx) => {
    const { b } = await i18n(ctx);
    try {
      await cancelBooking(ctx.match[1], String(ctx.from.id));
      await ctx.answerCallbackQuery({ text: b.cancelled });
    } catch {
      await ctx.answerCallbackQuery({ text: b.cancelFailed });
    }
    await showMy(ctx);
  });
}
