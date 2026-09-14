import { resolveLocale } from "@/i18n/server";
import { fail, handle, ok } from "@/lib/api";
import { UPCOMING_STATUSES } from "@/lib/booking/status";
import { bookingView } from "@/lib/booking/view";
import { prisma } from "@/lib/db";
import { ensureTelegramUser } from "@/lib/telegram/user";
import { tgUserFromRequest } from "@/lib/telegram/webapp";
import { todayISO } from "@/lib/time";

const include = { master: true, service: true, updates: { orderBy: { createdAt: "asc" } } } as const;

/** «Мои записи» в Mini App: предстоящие и последние прошедшие или отменённые */
export const GET = handle(async (req: Request) => {
  const tgUserId = tgUserFromRequest(req);
  if (!tgUserId) return fail("Unauthorized", 401, "unauthorized");
  const locale = await resolveLocale(new URL(req.url).searchParams.get("locale"));
  // язык приложения = язык сообщений бота
  await ensureTelegramUser(tgUserId, locale);

  const today = todayISO();
  const [upcoming, history] = await Promise.all([
    prisma.booking.findMany({
      where: { tgUserId, date: { gte: today }, status: { in: UPCOMING_STATUSES } },
      include,
      orderBy: [{ date: "asc" }, { startMin: "asc" }],
    }),
    prisma.booking.findMany({
      where: { tgUserId, OR: [{ date: { lt: today } }, { status: { notIn: UPCOMING_STATUSES } }] },
      include,
      orderBy: [{ date: "desc" }, { startMin: "desc" }],
      take: 10,
    }),
  ]);
  return ok({ upcoming: upcoming.map((b) => bookingView(b, locale)), history: history.map((b) => bookingView(b, locale)) });
});
