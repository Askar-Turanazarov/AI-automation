import { getDict } from "@/i18n";
import { resolveLocale } from "@/i18n/server";
import { quizInput, recommendTuning } from "@/lib/ai/quiz";
import { clientIp, fail, handle, ok, rateLimited } from "@/lib/api";

/** AI-подбор тюнинга: авто, цели и бюджет → пакет услуг из каталога */
export const POST = handle(async (req: Request) => {
  const body = await req.json();
  const locale = await resolveLocale(body.locale);
  if (rateLimited(`quiz:${clientIp(req)}`, 10)) return fail(getDict(locale).errors.rate, 429, "rate");
  return ok(await recommendTuning(quizInput.parse(body), locale));
});
