import { getDict } from "@/i18n";
import { resolveLocale } from "@/i18n/server";
import { clientIp, fail, handle, ok, rateLimited } from "@/lib/api";
import { createBooking } from "@/lib/booking/create";
import { bookingView } from "@/lib/booking/view";
import { ensureTelegramUser } from "@/lib/telegram/user";
import { verifyInitData } from "@/lib/telegram/webapp";

export const POST = handle(async (req: Request) => {
  const body = await req.json();
  const locale = await resolveLocale(body.locale);
  if (rateLimited(`book:${clientIp(req)}`, 10)) return fail(getDict(locale).errors.rate, 429, "rate");

  // запись из Telegram Mini App — привязываем к пользователю Telegram и запоминаем его язык
  const tgUserId = verifyInitData(body.initData);
  if (tgUserId) await ensureTelegramUser(tgUserId, locale);

  const b = await createBooking({ ...body, source: tgUserId ? "bot" : "web", tgUserId });
  return ok(bookingView(b, locale));
});
