import { getDict } from "@/i18n";
import { isLocale } from "@/i18n/config";
import { getRequestLocale } from "@/i18n/server";
import { askConsultant } from "@/lib/ai/assistant";
import { AllModelsFailedError } from "@/lib/ai/router";
import { clientIp, fail, handle, ok, rateLimited } from "@/lib/api";

export const POST = handle(async (req: Request) => {
  const { messages, locale: bodyLocale } = await req.json();
  const locale = isLocale(bodyLocale) ? bodyLocale : await getRequestLocale();
  const t = getDict(locale);
  if (rateLimited(`chat:${clientIp(req)}`, 20)) return fail(t.errors.rate, 429, "rate");
  if (!Array.isArray(messages) || !messages.length) return fail("messages required");
  try {
    const r = await askConsultant(messages, { channel: "web", locale });
    return ok({ text: r.text, provider: r.provider, model: r.model, booked: r.executed.some((e) => e.name === "create_booking") });
  } catch (e) {
    if (e instanceof AllModelsFailedError) {
      console.error("[chat]", e.message);
      return fail(t.errors.ai_unavailable, 503, "ai_unavailable");
    }
    throw e;
  }
});
