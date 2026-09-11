import { clientIp, fail, handle, ok, rateLimited } from "@/lib/api";
import { createBooking } from "@/lib/booking/create";
import { verifyInitData } from "@/lib/telegram/webapp";
import { formatDateRu, minToHHMM } from "@/lib/time";

export const POST = handle(async (req: Request) => {
  if (rateLimited(`book:${clientIp(req)}`, 10)) return fail("Слишком много попыток, подождите минуту", 429);
  const body = await req.json();
  // Запись из Telegram Mini App — привязываем к пользователю Telegram
  const tgUserId = verifyInitData(body.initData);
  const b = await createBooking({ ...body, source: tgUserId ? "bot" : "web", tgUserId });
  return ok({
    id: b.id,
    service: b.service.name,
    master: b.master.name,
    date: formatDateRu(b.date),
    time: `${minToHHMM(b.startMin)}–${minToHHMM(b.endMin)}`,
    price: b.service.price,
  });
});
