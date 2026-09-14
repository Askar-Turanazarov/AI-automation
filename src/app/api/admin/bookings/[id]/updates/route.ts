import { getDict } from "@/i18n";
import { getRequestLocale } from "@/i18n/server";
import { fail, handle, ok, type IdParams } from "@/lib/api";
import { addWorkUpdate } from "@/lib/booking/updates";
import { prisma } from "@/lib/db";

const MAX_PHOTO = 10 * 1024 * 1024; // лимит sendPhoto в Telegram

export const GET = handle(async (_req: Request, { params }: IdParams) => {
  const { id } = await params;
  return ok(await prisma.workUpdate.findMany({ where: { bookingId: id }, orderBy: { createdAt: "asc" } }));
});

/** Новый этап: multipart с полями text и photo (необязательно) */
export const POST = handle(async (req: Request, { params }: IdParams) => {
  const { id } = await params;
  const form = await req.formData();
  const photo = form.get("photo");
  const file = photo instanceof File && photo.size > 0 ? photo : null;
  if (file && (!file.type.startsWith("image/") || file.size > MAX_PHOTO)) {
    return fail(getDict(await getRequestLocale()).errors.photo_invalid, 422, "photo_invalid");
  }
  return ok(await addWorkUpdate(id, String(form.get("text") ?? ""), file));
});
