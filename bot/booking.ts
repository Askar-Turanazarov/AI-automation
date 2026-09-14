import { InlineKeyboard, Keyboard, type Bot, type Context } from "grammy";
import { tpl, type Dict } from "../src/i18n";
import { formatDate } from "../src/i18n/dates";
import { getAvailableDays, getDaySlots, MAX_DAYS_AHEAD } from "../src/lib/booking/availability";
import { bookingInput, createBooking } from "../src/lib/booking/create";
import { BookingError } from "../src/lib/booking/errors";
import { prisma } from "../src/lib/db";
import { localizedName, localizeMaster, localizeService } from "../src/lib/i18n-data";
import { formatPriceLine, formatUZS } from "../src/lib/money";
import { escapeHtml } from "../src/lib/telegram/notify";
import { addDays, formatTimeRange, minToHHMM, todayISO } from "../src/lib/time";
import { calendarKeyboard, timesKeyboard } from "./calendar-keyboard";
import { allLabels, i18n } from "./locale";
import { st } from "./state";
import { edit, mainKeyboard, miniAppUrl } from "./ui";

// ---------- запись: услуга ----------
async function showServices(ctx: Context) {
  const { locale, b } = await i18n(ctx);
  st(ctx).draft = {};
  const services = await prisma.service.findMany({
    where: { active: true, masters: { some: { master: { active: true } } } },
    orderBy: [{ category: "asc" }, { price: "asc" }],
  });
  const kb = new InlineKeyboard();
  for (const raw of services) {
    const s = localizeService(raw, locale);
    kb.text(`${s.name} · ${formatUZS(s.price, locale)}`, `svc:${s.id}`).row();
  }
  const url = miniAppUrl(locale);
  if (url) kb.webApp(b.miniAppShort, url);
  await edit(ctx, b.step1, kb);
}

// ---------- мастер ----------
async function showMasters(ctx: Context) {
  const { locale, t, b } = await i18n(ctx);
  const d = st(ctx).draft;
  // после рестарта бота черновик пуст — старые кнопки ведут к выбору услуги
  if (!d.serviceId) return showServices(ctx);
  const raw = await prisma.service.findUnique({ where: { id: d.serviceId }, include: { masters: { include: { master: true } } } });
  if (!raw) return showServices(ctx);
  const service = localizeService(raw, locale);
  const kb = new InlineKeyboard().text(b.anyMaster, "mst:any").row();
  for (const { master } of raw.masters.filter((m) => m.master.active)) {
    const m = localizeMaster(master, locale);
    kb.text(`${m.name} — ${m.specialty}`, `mst:${m.id}`).row();
  }
  kb.text(b.backServices, "back:svc");
  await edit(ctx, `<b>${escapeHtml(service.name)}</b>\n⏱ ${service.durationMin} ${t.common.min} · ${formatPriceLine(service.price, locale)}\n\n${b.step2}`, kb);
}

// ---------- календарь ----------
async function showCalendar(ctx: Context, month?: string) {
  const { locale, b } = await i18n(ctx);
  const d = st(ctx).draft;
  if (!d.serviceId) return showServices(ctx);
  const today = todayISO();
  const days = await getAvailableDays({ serviceId: d.serviceId, masterId: d.masterId, from: today, days: MAX_DAYS_AHEAD + 1 });
  if (!days) return showServices(ctx);
  const availability = Object.fromEntries(days.map((x) => [x.date, x.slots]));
  const firstFree = days.find((x) => x.slots > 0)?.date;
  const kb = calendarKeyboard(month ?? (firstFree ?? today).slice(0, 7), availability, today, addDays(today, MAX_DAYS_AHEAD), locale, b);
  await edit(ctx, firstFree ? b.step3 : b.allBusy, kb);
}

// ---------- время ----------
async function showTimes(ctx: Context) {
  const { locale, b } = await i18n(ctx);
  const d = st(ctx).draft;
  if (!d.serviceId || !d.date) return showServices(ctx);
  const day = await getDaySlots({ serviceId: d.serviceId, date: d.date, masterId: d.masterId });
  if (!day?.slots.length) {
    await ctx.answerCallbackQuery({ text: b.dayBusy }).catch(() => {});
    return showCalendar(ctx, d.date.slice(0, 7));
  }
  await edit(ctx, tpl(b.pickTime, { date: formatDate(d.date, locale) }), timesKeyboard(day.slots.map((s) => s.time), b));
}

// ---------- контакты ----------
async function askName(ctx: Context) {
  const { b } = await i18n(ctx);
  const s = st(ctx);
  const suggested = [ctx.from?.first_name, ctx.from?.last_name].filter(Boolean).join(" ");
  s.draft.await = "name";
  await edit(ctx, b.askName);
  if (suggested) await ctx.reply(b.nameHint, { reply_markup: new Keyboard().text(suggested).resized().oneTime() });
}

async function askPhone(ctx: Context) {
  const { b } = await i18n(ctx);
  st(ctx).draft.await = "phone";
  await ctx.reply(b.askPhone, { reply_markup: new Keyboard().requestContact(b.sharePhone).resized().oneTime() });
}

async function askCar(ctx: Context) {
  const { b } = await i18n(ctx);
  st(ctx).draft.await = "car";
  await ctx.reply(b.askCar, { reply_markup: new InlineKeyboard().text(b.skip, "car:skip") });
}

async function showConfirm(ctx: Context) {
  const { locale, b } = await i18n(ctx);
  const d = st(ctx).draft;
  d.await = undefined;
  if (!d.serviceId || !d.date || d.time === undefined || !d.name || !d.phone) return showServices(ctx);
  const raw = await prisma.service.findUnique({ where: { id: d.serviceId } });
  const master = d.masterId ? await prisma.master.findUnique({ where: { id: d.masterId } }) : null;
  if (!raw) return showServices(ctx);
  const service = localizeService(raw, locale);
  await ctx.reply(b.check, { reply_markup: mainKeyboard(b) });
  await ctx.reply(
    `<b>${escapeHtml(service.name)}</b>\n` +
      `🗓 ${formatDate(d.date, locale)}, ${formatTimeRange(d.time, d.time + service.durationMin)}\n` +
      `🔧 ${master ? escapeHtml(localizedName(master, locale)) : b.anyFreeMaster}\n` +
      `💰 ${formatPriceLine(service.price, locale)}\n\n` +
      `👤 ${escapeHtml(d.name)} · ${escapeHtml(d.phone)}${d.car ? `\n🚗 ${escapeHtml(d.car)}` : ""}`,
    { parse_mode: "HTML", reply_markup: new InlineKeyboard().text(b.confirmBtn, "confirm").text(b.abortBtn, "abort") },
  );
}

/** Текстовые шаги формы (имя → телефон → авто). false — шаг не ожидается, текст идёт ИИ */
export async function formStep(ctx: Context, text: string, b: Dict["bot"]) {
  const d = st(ctx).draft;
  if (d.await === "name") {
    if (text.length < 2) await ctx.reply(b.nameShort);
    else {
      d.name = text.slice(0, 60);
      await askPhone(ctx);
    }
    return true;
  }
  if (d.await === "phone") {
    // та же проверка, что и при создании записи
    if (!bookingInput.shape.phone.safeParse(text).success) await ctx.reply(b.phoneBad);
    else {
      d.phone = text;
      await askCar(ctx);
    }
    return true;
  }
  if (d.await === "car") {
    d.car = text.slice(0, 80);
    await showConfirm(ctx);
    return true;
  }
  return false;
}

export function registerBooking(bot: Bot) {
  bot.command("book", showServices);
  bot.hears(allLabels("btnBook"), showServices);

  bot.callbackQuery(/^svc:(.+)$/, async (ctx) => {
    st(ctx).draft = { serviceId: ctx.match[1] };
    await ctx.answerCallbackQuery();
    await showMasters(ctx);
  });

  bot.callbackQuery(/^mst:(.+)$/, async (ctx) => {
    st(ctx).draft.masterId = ctx.match[1] === "any" ? null : ctx.match[1];
    await ctx.answerCallbackQuery();
    await showCalendar(ctx);
  });
  bot.callbackQuery(/^cal:(\d{4}-\d{2})$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    await showCalendar(ctx, ctx.match[1]);
  });

  bot.callbackQuery(/^day:(\d{4}-\d{2}-\d{2})$/, async (ctx) => {
    st(ctx).draft.date = ctx.match[1];
    await ctx.answerCallbackQuery();
    await showTimes(ctx);
  });

  bot.callbackQuery(/^tm:(\d+)$/, async (ctx) => {
    const { locale, b } = await i18n(ctx);
    const s = st(ctx);
    s.draft.time = Number(ctx.match[1]);
    await ctx.answerCallbackQuery();
    if (!s.draft.serviceId || !s.draft.date) return showServices(ctx);
    if (!s.draft.masterId) {
      const day = await getDaySlots({ serviceId: s.draft.serviceId, date: s.draft.date, masterId: null });
      const ids = day?.slots.find((x) => x.time === s.draft.time)?.masterIds ?? [];
      if (day && ids.length > 1) {
        const kb = new InlineKeyboard().text(b.anyOfFree, "pick:any").row();
        for (const m of day.masters.filter((x) => ids.includes(x.id))) kb.text(localizedName(m, locale), `pick:${m.id}`).row();
        return edit(ctx, tpl(b.severalMasters, { time: minToHHMM(s.draft.time) }), kb);
      }
    }
    await askName(ctx);
  });
  bot.callbackQuery(/^pick:(.+)$/, async (ctx) => {
    const d = st(ctx).draft;
    await ctx.answerCallbackQuery();
    if (!d.serviceId || !d.date || d.time === undefined) return showServices(ctx);
    d.masterId = ctx.match[1] === "any" ? null : ctx.match[1];
    await askName(ctx);
  });

  bot.on("message:contact", async (ctx) => {
    const s = st(ctx);
    if (s.draft.await !== "phone") return;
    const phone = ctx.message.contact.phone_number;
    s.draft.phone = phone.startsWith("+") ? phone : `+${phone}`;
    await askCar(ctx);
  });

  bot.callbackQuery("car:skip", async (ctx) => {
    st(ctx).draft.car = "";
    await ctx.answerCallbackQuery();
    await ctx.editMessageReplyMarkup().catch(() => {});
    await showConfirm(ctx);
  });

  bot.callbackQuery("confirm", async (ctx) => {
    const { locale, t, b } = await i18n(ctx);
    const d = st(ctx).draft;
    await ctx.answerCallbackQuery();
    if (!d.serviceId || !d.date || d.time === undefined || !d.name || !d.phone) return showServices(ctx);
    try {
      const booking = await createBooking({
        serviceId: d.serviceId,
        masterId: d.masterId,
        date: d.date,
        startMin: d.time,
        clientName: d.name,
        phone: d.phone,
        car: d.car ?? "",
        source: "bot",
        tgUserId: String(ctx.from.id),
      });
      st(ctx).draft = {};
      await ctx.editMessageText(tpl(b.booked, { code: booking.id.slice(-5).toUpperCase(), master: localizedName(booking.master, locale) })).catch(() => {});
    } catch (e) {
      const msg = e instanceof BookingError ? t.errors[e.code] : b.bookFailed;
      await ctx.editMessageText(`⚠️ ${msg}`, { reply_markup: new InlineKeyboard().text(b.pickOtherTime, "back:cal") }).catch(() => {});
    }
  });

  bot.callbackQuery("abort", async (ctx) => {
    const { b } = await i18n(ctx);
    st(ctx).draft = {};
    await ctx.answerCallbackQuery({ text: b.abortedToast });
    await ctx.editMessageText(b.aborted).catch(() => {});
  });

  // ---------- назад ----------
  bot.callbackQuery(/^back:(svc|master|cal)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const where = ctx.match[1];
    if (where === "svc") return showServices(ctx);
    if (where === "master") return showMasters(ctx);
    return showCalendar(ctx, st(ctx).draft.date?.slice(0, 7));
  });
  bot.callbackQuery("nop", (ctx) => ctx.answerCallbackQuery());
}
