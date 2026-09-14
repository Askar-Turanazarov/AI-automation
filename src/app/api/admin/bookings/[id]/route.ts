import { z } from "zod";
import { handle, ok, type IdParams } from "@/lib/api";
import { cancelBooking } from "@/lib/booking/create";
import { notifyAskRating, notifyCancelledByAtelier } from "@/lib/booking/notify";
import { BOOKING_STATUSES } from "@/lib/booking/status";
import { prisma } from "@/lib/db";

const logFail = (e: unknown) => console.error("[telegram] client status notify failed", e);

export const PATCH = handle(async (req: Request, { params }: IdParams) => {
  const { id } = await params;
  const { status } = z.object({ status: z.enum(BOOKING_STATUSES) }).parse(await req.json());
  // клиент из Telegram сразу узнаёт об отмене, а после «Выполнена» получает просьбу оценить визит
  if (status === "cancelled") {
    const b = await cancelBooking(id);
    await notifyCancelledByAtelier(b).catch(logFail);
    return ok(b);
  }
  const b = await prisma.booking.update({ where: { id }, data: { status }, include: { master: true, service: true, review: true } });
  if (status === "done" && !b.review) await notifyAskRating(b).catch(logFail);
  return ok(b);
});
