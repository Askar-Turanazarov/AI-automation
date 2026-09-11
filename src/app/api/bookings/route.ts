import { getDict } from "@/i18n";
import { isLocale } from "@/i18n/config";
import { formatDate } from "@/i18n/dates";
import { getRequestLocale } from "@/i18n/server";
import { clientIp, fail, handle, ok, rateLimited } from "@/lib/api";
import { createBooking } from "@/lib/booking/create";
import { prisma } from "@/lib/db";
import { localizedName, localizeService } from "@/lib/i18n-data";
import { verifyInitData } from "@/lib/telegram/webapp";
import { minToHHMM } from "@/lib/time";

export const POST = handle(async (req: Request) => {
  const body = await req.json();
  const locale = isLocale(body.locale) ? body.locale : await getRequestLocale();
  if (rateLimited(`book:${clientIp(req)}`, 10)) return fail(getDict(locale).errors.rate, 429, "rate");

  // запись из Telegram Mini App — привязываем к пользователю Telegram и запоминаем его язык
  const tgUserId = verifyInitData(body.initData);
  if (tgUserId) await prisma.telegramUser.upsert({ where: { id: tgUserId }, create: { id: tgUserId, locale }, update: {} });

  const b = await createBooking({ ...body, source: tgUserId ? "bot" : "web", tgUserId });
  return ok({
    id: b.id,
    service: localizeService(b.service, locale).name,
    master: localizedName(b.master, locale),
    date: formatDate(b.date, locale),
    time: `${minToHHMM(b.startMin)}–${minToHHMM(b.endMin)}`,
    price: b.service.price,
  });
});
