import { z } from "zod";
import { prisma } from "@/lib/db";
import { BookingError } from "./errors";
import { sendWorkUpdate } from "./notify";

const updateText = z.string().trim().min(2).max(500);

/** Этап работ из админки: клиент из Telegram сразу получает его; фото хранится в Telegram, у нас — только file_id */
export async function addWorkUpdate(bookingId: string, rawText: string, photo: Blob | null) {
  const text = updateText.parse(rawText);
  const b = await prisma.booking.findUnique({ where: { id: bookingId }, include: { master: true, service: true } });
  if (!b) throw new BookingError("not_found");
  const photoFileId = await sendWorkUpdate(b, text, photo);
  if (photo && !photoFileId) throw new BookingError("photo_failed");
  return prisma.workUpdate.create({ data: { bookingId, text, photoFileId } });
}
