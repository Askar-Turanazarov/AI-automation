import "dotenv/config";
import { Bot, GrammyError, HttpError, InlineKeyboard, Keyboard, type Context } from "grammy";
import { askConsultant } from "../src/lib/ai/assistant";
import { AllModelsFailedError } from "../src/lib/ai/router";
import type { ChatMessage } from "../src/lib/ai/types";
import { getAvailableDays, getDaySlots, MAX_DAYS_AHEAD } from "../src/lib/booking/availability";
import { BookingError, cancelBooking, createBooking } from "../src/lib/booking/create";
import { BUSINESS } from "../src/lib/business";
import { prisma } from "../src/lib/db";
import { getDashboardStats } from "../src/lib/stats";
import { addDays, formatDateRu, formatPrice, minToHHMM, todayISO } from "../src/lib/time";
import { calendarKeyboard, timesKeyboard } from "./calendar-keyboard";

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error("TELEGRAM_BOT_TOKEN не задан в .env");
  process.exit(1);
}

const MINIAPP_URL = process.env.MINIAPP_URL?.startsWith("https://") ? `${process.env.MINIAPP_URL.replace(/\/$/, "")}/book` : null;
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

const bot = new Bot(token);

const BTN_BOOK = "📅 Записаться";
const BTN_MY = "🗂 Мои записи";
const BTN_AI = "✨ Спросить ИИ";
const mainKeyboard = new Keyboard().text(BTN_BOOK).text(BTN_MY).row().text(BTN_AI).resized().persistent();

async function edit(ctx: Context, text: string, reply_markup?: InlineKeyboard) {
  if (ctx.callbackQuery) {
    await ctx.editMessageText(text, { reply_markup, parse_mode: "HTML" }).catch(() => ctx.reply(text, { reply_markup, parse_mode: "HTML" }));
  } else {
    await ctx.reply(text, { reply_markup, parse_mode: "HTML" });
  }
}

// ---------- старт ----------
bot.command("start", async (ctx) => {
  states.delete(ctx.chat.id);
  await ctx.reply(
    `🔥 <b>${BUSINESS.name}</b> — ${BUSINESS.tagline.toLowerCase()}.\n\n` +
      `Чип-тюнинг, выхлоп, подвеска, PPF и интерьер.\n` +
      `Здесь можно записаться к мастеру за минуту или просто спросить ИИ-консультанта — пишите вопрос текстом.`,
    { parse_mode: "HTML", reply_markup: mainKeyboard },
  );
  if (MINIAPP_URL) {
    await ctx.reply("Удобнее с большим календарём? Откройте мини-приложение 👇", {
      reply_markup: new InlineKeyboard().webApp("📱 Открыть календарь записи", MINIAPP_URL),
    });
  }
});

bot.command("id", (ctx) => ctx.reply(`chat_id: <code>${ctx.chat.id}</code>`, { parse_mode: "HTML" }));

bot.command("help", (ctx) =>
  ctx.reply(`📍 ${BUSINESS.address}\n🕒 ${BUSINESS.hours}\n📞 ${BUSINESS.phone}\n\n/book — запись\n/my — мои записи\nИли просто напишите вопрос.`),
);

// ---------- запись: услуга ----------
async function showServices(ctx: Context) {
  st(ctx).draft = {};
  const services = await prisma.service.findMany({ where: { active: true, masters: { some: { master: { active: true } } } }, orderBy: [{ category: "asc" }, { price: "asc" }] });
  const kb = new InlineKeyboard();
  for (const s of services) kb.text(`${s.name} · ${formatPrice(s.price)}`, `svc:${s.id}`).row();
  if (MINIAPP_URL) kb.webApp("📱 Большой календарь", MINIAPP_URL);
  await edit(ctx, "<b>Шаг 1/4.</b> Выберите услугу:", kb);
}
bot.command("book", showServices);
bot.hears(BTN_BOOK, showServices);

// ---------- мастер ----------
async function showMasters(ctx: Context) {
  const d = st(ctx).draft;
  const service = await prisma.service.findUnique({ where: { id: d.serviceId }, include: { masters: { include: { master: true } } } });
  if (!service) return showServices(ctx);
  const kb = new InlineKeyboard().text("🎲 Любой свободный мастер", "mst:any").row();
  for (const { master } of service.masters.filter((m) => m.master.active)) kb.text(`${master.name} — ${master.specialty}`, `mst:${master.id}`).row();
  kb.text("← Услуги", "back:svc");
  await edit(ctx, `<b>${service.name}</b>\n⏱ ${service.durationMin} мин · ${formatPrice(service.price)}\n\n<b>Шаг 2/4.</b> Выберите мастера:`, kb);
}

bot.callbackQuery(/^svc:(.+)$/, async (ctx) => {
  st(ctx).draft = { serviceId: ctx.match[1] };
  await ctx.answerCallbackQuery();
  await showMasters(ctx);
});

// ---------- календарь ----------
async function showCalendar(ctx: Context, month?: string) {
  const d = st(ctx).draft;
  const today = todayISO();
  const days = await getAvailableDays({ serviceId: d.serviceId!, masterId: d.masterId, from: today, days: MAX_DAYS_AHEAD + 1 });
  if (!days) return showServices(ctx);
  const availability = Object.fromEntries(days.map((x) => [x.date, x.slots]));
  const firstFree = days.find((x) => x.slots > 0)?.date;
  const m = month ?? (firstFree ?? today).slice(0, 7);
  const kb = calendarKeyboard(m, availability, today, addDays(today, MAX_DAYS_AHEAD));
  await edit(ctx, firstFree ? "<b>Шаг 3/4.</b> Выберите день (числа — есть свободное время):" : "😔 Ближайшие 2 месяца всё занято. Попробуйте другого мастера.", kb);
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
  const d = st(ctx).draft;
  const day = await getDaySlots({ serviceId: d.serviceId!, date: d.date!, masterId: d.masterId });
  if (!day?.slots.length) {
    await ctx.answerCallbackQuery({ text: "На этот день уже всё занято" }).catch(() => {});
    return showCalendar(ctx, d.date!.slice(0, 7));
  }
  await edit(ctx, `🗓 <b>${formatDateRu(d.date!)}</b>\n\nВыберите время начала:`, timesKeyboard(day.slots.map((s) => s.time)));
}

bot.callbackQuery(/^day:(\d{4}-\d{2}-\d{2})$/, async (ctx) => {
  st(ctx).draft.date = ctx.match[1];
  await ctx.answerCallbackQuery();
  await showTimes(ctx);
});

bot.callbackQuery(/^tm:(\d+)$/, async (ctx) => {
  const s = st(ctx);
  s.draft.time = Number(ctx.match[1]);
  await ctx.answerCallbackQuery();
  if (!s.draft.masterId) {
    const day = await getDaySlots({ serviceId: s.draft.serviceId!, date: s.draft.date!, masterId: null });
    const ids = day?.slots.find((x) => x.time === s.draft.time)?.masterIds ?? [];
    if (ids.length > 1) {
      const kb = new InlineKeyboard().text("🎲 Любой из свободных", "pick:any").row();
      for (const id of ids) {
        const m = day!.masters.find((x) => x.id === id)!;
        kb.text(m.name, `pick:${id}`).row();
      }
      return edit(ctx, `В ${minToHHMM(s.draft.time)} свободны несколько мастеров. К кому записать?`, kb);
    }
  }
  await askName(ctx);
});
bot.callbackQuery(/^pick:(.+)$/, async (ctx) => {
  st(ctx).draft.masterId = ctx.match[1] === "any" ? null : ctx.match[1];
  await ctx.answerCallbackQuery();
  await askName(ctx);
});

// ---------- контакты ----------
async function askName(ctx: Context) {
  const s = st(ctx);
  const suggested = [ctx.from?.first_name, ctx.from?.last_name].filter(Boolean).join(" ");
  s.draft.await = "name";
  await edit(ctx, "<b>Шаг 4/4.</b> Как к вам обращаться?");
  if (suggested) await ctx.reply("Напишите имя или нажмите кнопку:", { reply_markup: new Keyboard().text(suggested).resized().oneTime() });
}

async function askPhone(ctx: Context) {
  st(ctx).draft.await = "phone";
  await ctx.reply("📞 Ваш номер телефона:", { reply_markup: new Keyboard().requestContact("📲 Отправить мой номер").resized().oneTime() });
}

async function askCar(ctx: Context) {
  st(ctx).draft.await = "car";
  await ctx.reply("🚗 Марка и модель авто:", { reply_markup: new InlineKeyboard().text("Пропустить", "car:skip") });
}

async function showConfirm(ctx: Context) {
  const d = st(ctx).draft;
  d.await = undefined;
  const service = await prisma.service.findUnique({ where: { id: d.serviceId } });
  const master = d.masterId ? await prisma.master.findUnique({ where: { id: d.masterId } }) : null;
  if (!service) return showServices(ctx);
  await ctx.reply("Проверьте запись 👇", { reply_markup: mainKeyboard });
  await ctx.reply(
    `<b>${service.name}</b>\n` +
      `🗓 ${formatDateRu(d.date!)}, ${minToHHMM(d.time!)}–${minToHHMM(d.time! + service.durationMin)}\n` +
      `🔧 ${master?.name ?? "Любой свободный мастер"}\n` +
      `💰 ${formatPrice(service.price)}\n\n` +
      `👤 ${d.name} · ${d.phone}${d.car ? `\n🚗 ${d.car}` : ""}`,
    { parse_mode: "HTML", reply_markup: new InlineKeyboard().text("✅ Подтвердить", "confirm").text("✕ Отмена", "abort") },
  );
}

bot.on("message:contact", async (ctx) => {
  const s = st(ctx);
  if (s.draft.await !== "phone") return;
  s.draft.phone = ctx.message.contact.phone_number.startsWith("+") ? ctx.message.contact.phone_number : `+${ctx.message.contact.phone_number}`;
  await askCar(ctx);
});

bot.callbackQuery("car:skip", async (ctx) => {
  st(ctx).draft.car = "";
  await ctx.answerCallbackQuery();
  await ctx.editMessageReplyMarkup().catch(() => {});
  await showConfirm(ctx);
});

bot.callbackQuery("confirm", async (ctx) => {
  const d = st(ctx).draft;
  await ctx.answerCallbackQuery();
  try {
    const b = await createBooking({
      serviceId: d.serviceId!,
      masterId: d.masterId,
      date: d.date!,
      startMin: d.time!,
      clientName: d.name!,
      phone: d.phone!,
      car: d.car ?? "",
      source: "bot",
      tgUserId: String(ctx.from.id),
    });
    st(ctx).draft = {};
    await ctx.editMessageText(`🔥 Готово! Запись #${b.id.slice(-5).toUpperCase()} создана.\nМастер: ${b.master.name}`).catch(() => {});
  } catch (e) {
    const msg = e instanceof BookingError ? e.message : "Не получилось создать запись. Проверьте данные.";
    await ctx.editMessageText(`⚠️ ${msg}`, { reply_markup: new InlineKeyboard().text("Выбрать другое время", "back:cal") }).catch(() => {});
  }
});

bot.callbackQuery("abort", async (ctx) => {
  st(ctx).draft = {};
  await ctx.answerCallbackQuery({ text: "Запись отменена" });
  await ctx.editMessageText("Окей, запись не создана. Возвращайтесь, когда будете готовы 🤙").catch(() => {});
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
  const list = await prisma.booking.findMany({
    where: { tgUserId: String(ctx.from!.id), date: { gte: todayISO() }, status: { in: ["confirmed", "pending"] } },
    include: { service: true, master: true },
    orderBy: [{ date: "asc" }, { startMin: "asc" }],
  });
  if (!list.length) return edit(ctx, "У вас нет предстоящих записей.", new InlineKeyboard().text("📅 Записаться", "back:svc"));
  const kb = new InlineKeyboard();
  const text = list
    .map((b, i) => {
      kb.text(`✕ Отменить №${i + 1}`, `del:${b.id}`).row();
      return `<b>${i + 1}. ${b.service.name}</b>\n🗓 ${formatDateRu(b.date)}, ${minToHHMM(b.startMin)} · ${b.master.name}`;
    })
    .join("\n\n");
  await edit(ctx, `🗂 <b>Ваши записи</b>\n\n${text}`, kb);
}
bot.command("my", showMy);
bot.hears(BTN_MY, showMy);

bot.callbackQuery(/^del:(.+)$/, async (ctx) => {
  try {
    await cancelBooking(ctx.match[1], String(ctx.from.id));
    await ctx.answerCallbackQuery({ text: "Запись отменена" });
  } catch {
    await ctx.answerCallbackQuery({ text: "Не удалось отменить" });
  }
  await showMy(ctx);
});

// ---------- для владельца ----------
bot.command("stats", async (ctx) => {
  if (String(ctx.chat.id) !== ADMIN_CHAT_ID) return;
  const s = await getDashboardStats();
  const load = s.workloadWeek.map((m) => `• ${m.name}: ${m.load}% (${m.bookings} зап.)`).join("\n");
  await ctx.reply(
    `📊 <b>Сводка на ${formatDateRu(s.today)}</b>\n\n` +
      `Сегодня: ${s.kpi.bookingsToday} · 7 дней: ${s.kpi.bookingsWeek}\n` +
      `Выручка месяца: ${formatPrice(s.kpi.revenueMonth)}\nСредний чек: ${formatPrice(s.kpi.avgCheck)}\n` +
      `Загрузка недели: ${s.kpi.loadWeek}%\n\n<b>Мастера:</b>\n${load}`,
    { parse_mode: "HTML" },
  );
});

bot.command("today", async (ctx) => {
  if (String(ctx.chat.id) !== ADMIN_CHAT_ID) return;
  const list = await prisma.booking.findMany({ where: { date: todayISO(), status: { not: "cancelled" } }, include: { service: true, master: true }, orderBy: { startMin: "asc" } });
  await ctx.reply(list.length ? list.map((b) => `${minToHHMM(b.startMin)} · ${b.service.name} · ${b.master.name} · ${b.clientName} ${b.phone}`).join("\n") : "Сегодня записей нет");
});

// ---------- текст: шаги формы или ИИ ----------
bot.hears(BTN_AI, (ctx) => ctx.reply("Спрашивайте что угодно: цены, что выбрать для вашей машины, свободное время — я могу и записать вас 🙂"));

bot.on("message:text", async (ctx) => {
  const s = st(ctx);
  const text = ctx.message.text.trim();
  if (text.startsWith("/")) return;

  if (s.draft.await === "name") {
    if (text.length < 2) return ctx.reply("Имя слишком короткое, попробуйте ещё раз");
    s.draft.name = text.slice(0, 60);
    return askPhone(ctx);
  }
  if (s.draft.await === "phone") {
    if (!/^[+\d][\d\s()-]{5,20}$/.test(text)) return ctx.reply("Похоже, номер некорректный. Пример: +7 701 123 45 67");
    s.draft.phone = text;
    return askCar(ctx);
  }
  if (s.draft.await === "car") {
    s.draft.car = text.slice(0, 80);
    return showConfirm(ctx);
  }

  if (s.aiBusy) return ctx.reply("⏳ Ещё думаю над предыдущим вопросом…");
  s.aiBusy = true;
  s.ai.push({ role: "user", content: text });
  await ctx.replyWithChatAction("typing");
  const typing = setInterval(() => ctx.replyWithChatAction("typing").catch(() => {}), 4500);
  try {
    const r = await askConsultant(s.ai, { channel: "bot", tgUserId: String(ctx.from.id) });
    s.ai.push({ role: "assistant", content: r.text });
    s.ai = s.ai.slice(-20);
    await ctx.reply(r.text.slice(0, 4000), { reply_markup: mainKeyboard });
  } catch (e) {
    s.ai.pop();
    console.error("[bot ai]", e instanceof Error ? e.message : e);
    await ctx.reply(
      e instanceof AllModelsFailedError ? "ИИ-консультант сейчас недоступен 🙏 Запишитесь через кнопку «📅 Записаться» или позвоните нам." : "Что-то пошло не так, попробуйте ещё раз.",
      { reply_markup: mainKeyboard },
    );
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
  await bot.api.setMyCommands([
    { command: "book", description: "Записаться" },
    { command: "my", description: "Мои записи" },
    { command: "help", description: "Контакты и помощь" },
  ]);
  if (MINIAPP_URL) await bot.api.setChatMenuButton({ menu_button: { type: "web_app", text: "Запись", web_app: { url: MINIAPP_URL } } });
  const me = await bot.api.getMe();
  console.log(`🤖 @${me.username} запущен (long polling)${MINIAPP_URL ? `, Mini App: ${MINIAPP_URL}` : ""}`);
  await bot.start({ drop_pending_updates: true });
}

main();
process.once("SIGINT", () => bot.stop());
process.once("SIGTERM", () => bot.stop());
