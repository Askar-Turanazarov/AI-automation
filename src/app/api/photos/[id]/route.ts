import { fail, handle, type IdParams } from "@/lib/api";
import { prisma } from "@/lib/db";
import { fetchTelegramFile } from "@/lib/telegram/notify";

/** Фото этапа работ: скачиваем из Telegram по file_id, токен бота в браузер не попадает. id — непредсказуемый cuid */
export const GET = handle(async (_req: Request, { params }: IdParams) => {
  const { id } = await params;
  const update = await prisma.workUpdate.findUnique({ where: { id }, select: { photoFileId: true } });
  const file = update?.photoFileId ? await fetchTelegramFile(update.photoFileId) : null;
  if (!file?.body) return fail("Not found", 404, "not_found");
  const type = file.headers.get("content-type");
  return new Response(file.body, {
    headers: { "Content-Type": type?.startsWith("image/") ? type : "image/jpeg", "Cache-Control": "private, max-age=86400" },
  });
});
