import { resolveLocale } from "@/i18n/server";
import { fail, handle, ok, type IdParams } from "@/lib/api";
import { cancelBooking, rescheduleBooking } from "@/lib/booking/create";
import { bookingView } from "@/lib/booking/view";
import { tgUserFromRequest } from "@/lib/telegram/webapp";

const unauthorized = () => fail("Unauthorized", 401, "unauthorized");

/** Перенос своей записи из Mini App */
export const PATCH = handle(async (req: Request, { params }: IdParams) => {
  const tgUserId = tgUserFromRequest(req);
  if (!tgUserId) return unauthorized();
  const { id } = await params;
  const body = await req.json();
  const locale = await resolveLocale(body.locale);
  const b = await rescheduleBooking(id, tgUserId, body);
  return ok(bookingView(b, locale));
});

/** Отмена своей записи из Mini App (чужую cancelBooking не найдёт) */
export const DELETE = handle(async (req: Request, { params }: IdParams) => {
  const tgUserId = tgUserFromRequest(req);
  if (!tgUserId) return unauthorized();
  const { id } = await params;
  await cancelBooking(id, tgUserId);
  return ok({ ok: true });
});
