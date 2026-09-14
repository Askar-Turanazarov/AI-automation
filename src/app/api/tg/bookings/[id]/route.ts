import { fail, handle, ok, type IdParams } from "@/lib/api";
import { cancelBooking } from "@/lib/booking/create";
import { tgUserFromRequest } from "@/lib/telegram/webapp";

/** Отмена своей записи из Mini App (чужую cancelBooking не найдёт) */
export const DELETE = handle(async (req: Request, { params }: IdParams) => {
  const tgUserId = tgUserFromRequest(req);
  if (!tgUserId) return fail("Unauthorized", 401, "unauthorized");
  const { id } = await params;
  await cancelBooking(id, tgUserId);
  return ok({ ok: true });
});
