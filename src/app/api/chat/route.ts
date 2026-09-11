import { clientIp, fail, handle, ok, rateLimited } from "@/lib/api";
import { askConsultant } from "@/lib/ai/assistant";
import { AllModelsFailedError } from "@/lib/ai/router";

export const POST = handle(async (req: Request) => {
  if (rateLimited(`chat:${clientIp(req)}`, 20)) return fail("Слишком много сообщений, подождите минуту", 429);
  const { messages } = await req.json();
  if (!Array.isArray(messages) || !messages.length) return fail("messages required");
  try {
    const r = await askConsultant(messages, { channel: "web" });
    return ok({ text: r.text, provider: r.provider, model: r.model, booked: r.executed.some((e) => e.name === "create_booking") });
  } catch (e) {
    if (e instanceof AllModelsFailedError) {
      console.error("[chat]", e.message);
      return fail("Ассистент временно недоступен. Запишитесь через календарь или позвоните нам.", 503);
    }
    throw e;
  }
});
