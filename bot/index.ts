import "dotenv/config";
import { Bot, GrammyError, HttpError, InlineKeyboard, Keyboard, type Context } from "grammy";
import { dictionaries, getDict, tpl, type Dict } from "../src/i18n";
import { isLocale, localeFromTelegram, locales, type Locale } from "../src/i18n/config";
import { formatDate } from "../src/i18n/dates";
import { askConsultant } from "../src/lib/ai/assistant";
import { AllModelsFailedError } from "../src/lib/ai/router";
import type { ChatMessage } from "../src/lib/ai/types";
import { getAvailableDays, getDaySlots, MAX_DAYS_AHEAD } from "../src/lib/booking/availability";
import { BookingError, cancelBooking, createBooking } from "../src/lib/booking/create";
import { businessInfo } from "../src/lib/business";
import { prisma } from "../src/lib/db";
import { localizedName, localizeMaster, localizeService } from "../src/lib/i18n-data";
import { formatPriceLine, formatUZS } from "../src/lib/money";
import { getDashboardStats } from "../src/lib/stats";
import { escapeHtml } from "../src/lib/telegram/notify";
import { addDays, minToHHMM, todayISO } from "../src/lib/time";
import { calendarKeyboard, timesKeyboard } from "./calendar-keyboard";

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error("TELEGRAM_BOT_TOKEN не задан в .env");
  process.exit(1);
}

const MINIAPP_BASE = process.env.MINIAPP_URL?.startsWith("https://") ? process.env.MINIAPP_URL.replace(/\/$/, "") : null;
const miniAppUrl = (locale: Locale) => (MINIAPP_BASE ? `${MINIAPP_BASE}/${locale}/book` : null);
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;

type Draft = {
  serviceId?: string;
  masterId?: string | null;
  date?: string;
  time?: number;
  name?: string;
  phone?: string;
  car?: string;
  await?: "name" | "phone" | "car";
};
type State = { draft: Draft; ai: ChatMessage[]; aiBusy?: boolean };

const states = new Map<number, State>();
const st = (ctx: Context) => {
  const id = ctx.chat!.id;
  if (!states.has(id)) states.set(id, { draft: {}, ai: [] });
  return states.get(id)!;
};

// ---------- язык пользователя: сохранённый выбор → язык Telegram ----------
const localeCache = new Map<string, Locale>();

async function getLocale(ctx: Context): Promise<Locale> {
  const id = String(ctx.from?.id ?? ctx.chat?.id);
  const cached = localeCache.get(id);
  if (cached) return cached;
  const saved = await prisma.telegramUser.findUnique({ where: { id } });
  const locale = isLocale(saved?.locale) ? saved.locale : localeFromTelegram(ctx.from?.language_code);
  if (!saved) await prisma.telegramUser.create({ data: { id, locale } }).catch(() => {});
  localeCache.set(id, locale);
  return locale;
}

async function i18n(ctx: Context) {
  const locale = await getLocale(ctx);
  const t = getDict(locale);
  return { locale, t, b: t.bot };
}

/** Текст кнопки на всех трёх языках — чтобы кнопки работали после смены языка */
const allLabels = (key: keyof Dict["bot"]) => locales.map((l) => dictionaries[l].bot[key]);

const mainKeyboard = (b: Dict["bot"]) => new Keyboard().text(b.btnBook).text(b.btnMy).row().text(b.btnAi).text(b.btnLang).resized().persistent();

const bot = new Bot(token);

async function edit(ctx: Context, text: string, reply_markup?: InlineKeyboard) {
  if (ctx.callbackQuery) {
    await ctx.editMessageText(text, { reply_markup, parse_mode: "HTML" }).catch(() => ctx.reply(text, { reply_markup, parse_mode: "HTML" }));
  } else {
    await ctx.reply(text, { reply_markup, parse_mode: "HTML" });
  }
}

async function setMenuButton(ctx: Context, locale: Locale) {
  const url = miniAppUrl(locale);
  if (!url || !ctx.chat) return;
  await ctx.api
    .setChatMenuButton({ chat_id: ctx.chat.id, menu_button: { type: "web_app", text: getDict(locale).bot.menuButton, web_app: { url } } })
    .catch(() => {});
}

// ---------- старт, язык, помощь ----------
bot.command("start", async (ctx) => {
  states.delete(ctx.chat.id);
  const { locale, b } = await i18n(ctx);
  await ctx.reply(b.welcome, { parse_mode: "HTML", reply_markup: mainKeyboard(b) });
  const url = miniAppUrl(locale);
  if (url) {
    await ctx.reply(b.miniApp, { reply_markup: new InlineKeyboard().webApp(b.miniAppBtn, url) });
    await setMenuButton(ctx, locale);
  }
});

async function showLanguages(ctx: Context) {
  const { b } = await i18n(ctx);
  await ctx.reply(b.langPick, {
    reply_markup: new InlineKeyboard().text("🇷🇺 Русский", "lang:ru").text("🇺🇿 O'zbekcha", "lang:uz").text("🇬🇧 English", "lang:en"),
  });
}
bot.command("lang", showLanguages);
bot.hears(allLabels("btnLang"), showLanguages);

bot.callbackQuery(/^lang:(ru|uz|en)$/, async (ctx) => {
  const locale = ctx.match[1] as Locale;
  const id = String(ctx.from.id);
  await prisma.telegramUser.upsert({ where: { id }, create: { id, locale }, update: { locale } });
  localeCache.set(id, locale);
  const b = getDict(locale).bot;
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(b.langSet).catch(() => {});
  await ctx.reply(b.welcome, { parse_mode: "HTML", reply_markup: mainKeyboard(b) });
  await setMenuButton(ctx, locale);
});

bot.command("id", (ctx) => ctx.reply(`chat_id: <code>${ctx.chat.id}</code>`, { parse_mode: "HTML" }));

bot.command("help", async (ctx) => {
  const { locale, b } = await i18n(ctx);
  const biz = businessInfo(locale);
  await ctx.reply(tpl(b.help, { address: biz.address, hours: biz.hours, phone: biz.phone }));
});

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
bot.command("book", showServices);
bot.hears(allLabels("btnBook"), showServices);

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

bot.callbackQuery(/^svc:(.+)$/, async (ctx) => {
  st(ctx).draft = { serviceId: ctx.match[1] };
  await ctx.answerCallbackQuery();
  await showMasters(ctx);
});

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

bot.callbackQuery(/^mst:(.+)$/, async (ctx) => {
  st(ctx).draft.masterId = ctx.match[1] === "any" ? null : ctx.match[1];
  await ctx.answerCallbackQuery();
  await showCalendar(ctx);
});
bot.callbackQuery(/^cal:(\d{4}-\d{2})$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  await showCalendar(ctx, ctx.match[1]);
});

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
    if (ids.length > 1) {
      const masters = await prisma.master.findMany({ where: { id: { in: ids } } });
      const kb = new InlineKeyboard().text(b.anyOfFree, "pick:any").row();
      for (const m of masters) kb.text(localizedName(m, locale), `pick:${m.id}`).row();
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
      `🗓 ${formatDate(d.date, locale)}, ${minToHHMM(d.time)}–${minToHHMM(d.time + service.durationMin)}\n` +
      `🔧 ${master ? escapeHtml(localizedName(master, locale)) : b.anyFreeMaster}\n` +
      `💰 ${formatPriceLine(service.price, locale)}\n\n` +
      `👤 ${escapeHtml(d.name)} · ${escapeHtml(d.phone)}${d.car ? `\n🚗 ${escapeHtml(d.car)}` : ""}`,
    { parse_mode: "HTML", reply_markup: new InlineKeyboard().text(b.confirmBtn, "confirm").text(b.abortBtn, "abort") },
  );
}

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

// ---------- мои записи ----------
async function showMy(ctx: Context) {
  const { locale, b } = await i18n(ctx);
  const list = await prisma.booking.findMany({
    where: { tgUserId: String(ctx.from!.id), date: { gte: todayISO() }, status: { in: ["confirmed", "pending"] } },
    include: { service: true, master: true },
    orderBy: [{ date: "asc" }, { startMin: "asc" }],
  });
  if (!list.length) return edit(ctx, b.noBookings, new InlineKeyboard().text(b.btnBook, "back:svc"));
  const kb = new InlineKeyboard();
  const text = list
    .map((bk, i) => {
      kb.text(tpl(b.cancelN, { n: i + 1 }), `del:${bk.id}`).row();
      return `<b>${i + 1}. ${escapeHtml(localizeService(bk.service, locale).name)}</b>\n🗓 ${formatDate(bk.date, locale)}, ${minToHHMM(bk.startMin)} · ${escapeHtml(localizedName(bk.master, locale))}`;
    })
    .join("\n\n");
  await edit(ctx, `${b.myTitle}\n\n${text}`, kb);
}
bot.command("my", showMy);
bot.hears(allLabels("btnMy"), showMy);

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

// ---------- для владельца (по-русски) ----------
bot.command("stats", async (ctx) => {
  if (String(ctx.chat.id) !== ADMIN_CHAT_ID) return;
  const s = await getDashboardStats();
  const load = s.workloadWeek.map((m) => `• ${escapeHtml(m.name)}: ${m.load}% (${m.bookings} зап.)`).join("\n");
  await ctx.reply(
    `📊 <b>Сводка на ${formatDate(s.today, "ru")}</b>\n\n` +
      `Сегодня: ${s.kpi.bookingsToday} · 7 дней: ${s.kpi.bookingsWeek}\n` +
      `Выручка месяца: ${formatPriceLine(s.kpi.revenueMonth, "ru")}\nСредний чек: ${formatPriceLine(s.kpi.avgCheck, "ru")}\n` +
      `Загрузка недели: ${s.kpi.loadWeek}%\n\n<b>Мастера:</b>\n${load}`,
    { parse_mode: "HTML" },
  );
});

bot.command("today", async (ctx) => {
  if (String(ctx.chat.id) !== ADMIN_CHAT_ID) return;
  const list = await prisma.booking.findMany({
    where: { date: todayISO(), status: { not: "cancelled" } },
    include: { service: true, master: true },
    orderBy: { startMin: "asc" },
  });
  await ctx.reply(list.length ? list.map((x) => `${minToHHMM(x.startMin)} · ${x.service.name} · ${x.master.name} · ${x.clientName} ${x.phone}`).join("\n") : "Сегодня записей нет");
});

// ---------- текст: шаги формы или ИИ ----------
bot.hears(allLabels("btnAi"), async (ctx) => {
  const { b } = await i18n(ctx);
  await ctx.reply(b.aiIntro);
});

bot.on("message:text", async (ctx) => {
  const { locale, b } = await i18n(ctx);
  const s = st(ctx);
  const text = ctx.message.text.trim();
  if (text.startsWith("/")) return;

  if (s.draft.await === "name") {
    if (text.length < 2) return ctx.reply(b.nameShort);
    s.draft.name = text.slice(0, 60);
    return askPhone(ctx);
  }
  if (s.draft.await === "phone") {
    if (!/^[+\d][\d\s()-]{5,20}$/.test(text)) return ctx.reply(b.phoneBad);
    s.draft.phone = text;
    return askCar(ctx);
  }
  if (s.draft.await === "car") {
    s.draft.car = text.slice(0, 80);
    return showConfirm(ctx);
  }

  if (s.aiBusy) return ctx.reply(b.aiBusy);
  s.aiBusy = true;
  s.ai.push({ role: "user", content: text });
  await ctx.replyWithChatAction("typing");
  const typing = setInterval(() => ctx.replyWithChatAction("typing").catch(() => {}), 4500);
  try {
    const r = await askConsultant(s.ai, { channel: "bot", locale, tgUserId: String(ctx.from.id) });
    s.ai.push({ role: "assistant", content: r.text });
    s.ai = s.ai.slice(-20);
    await ctx.reply(r.text.slice(0, 4000), { reply_markup: mainKeyboard(b) });
  } catch (e) {
    s.ai.pop();
    console.error("[bot ai]", e instanceof Error ? e.message : e);
    await ctx.reply(e instanceof AllModelsFailedError ? b.aiDown : b.oops, { reply_markup: mainKeyboard(b) });
  } finally {
    clearInterval(typing);
    s.aiBusy = false;
  }
});

bot.catch((err) => {
  const e = err.error;
  if (e instanceof GrammyError) console.error("Telegram error:", e.description);
  else if (e instanceof HttpError) console.error("Network error:", e);
  else console.error("Bot error:", e);
});

async function main() {
  const commands = (l: Locale) => {
    const b = dictionaries[l].bot;
    return [
      { command: "book", description: b.cmdBook },
      { command: "my", description: b.cmdMy },
      { command: "lang", description: b.cmdLang },
      { command: "help", description: b.cmdHelp },
    ];
  };
  await bot.api.setMyCommands(commands("ru"));
  for (const l of locales) await bot.api.setMyCommands(commands(l), { language_code: l });
  if (MINIAPP_BASE) {
    await bot.api.setChatMenuButton({ menu_button: { type: "web_app", text: dictionaries.ru.bot.menuButton, web_app: { url: `${MINIAPP_BASE}/book` } } });
  }
  const me = await bot.api.getMe();
  console.log(`🤖 @${me.username} запущен (long polling)${MINIAPP_BASE ? `, Mini App: ${MINIAPP_BASE}/{ru|uz|en}/book` : ""}`);
  await bot.start({ drop_pending_updates: true });
}

main().catch((e) => {
  console.error("Не удалось запустить бота:", e instanceof GrammyError ? e.description : e instanceof Error ? e.message : e);
  process.exit(1);
});
process.once("SIGINT", () => bot.stop());
process.once("SIGTERM", () => bot.stop());
