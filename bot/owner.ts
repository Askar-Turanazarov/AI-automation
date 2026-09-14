import type { Bot } from "grammy";
import { formatDate } from "../src/i18n/dates";
import { NOT_CANCELLED } from "../src/lib/booking/status";
import { prisma } from "../src/lib/db";
import { formatPriceLine } from "../src/lib/money";
import { getDashboardStats } from "../src/lib/stats";
import { escapeHtml } from "../src/lib/telegram/notify";
import { minToHHMM, todayISO } from "../src/lib/time";

const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;

// ---------- для владельца (по-русски) ----------
export function registerOwner(bot: Bot) {
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
      where: { date: todayISO(), status: NOT_CANCELLED },
      include: { service: true, master: true },
      orderBy: { startMin: "asc" },
    });
    await ctx.reply(list.length ? list.map((x) => `${minToHHMM(x.startMin)} · ${x.service.name} · ${x.master.name} · ${x.clientName} ${x.phone}`).join("\n") : "Сегодня записей нет");
  });
}
