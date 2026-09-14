import type { Bot } from "grammy";
import { askConsultant } from "../src/lib/ai/assistant";
import { AllModelsFailedError } from "../src/lib/ai/router";
import { formStep } from "./booking";
import { allLabels, i18n } from "./locale";
import { st } from "./state";
import { mainKeyboard } from "./ui";

// ---------- текст: шаги формы или ИИ ----------
// регистрировать последним: ловит любой текст, который не забрали команды и кнопки
export function registerAi(bot: Bot) {
  bot.hears(allLabels("btnAi"), async (ctx) => {
    const { b } = await i18n(ctx);
    await ctx.reply(b.aiIntro);
  });

  bot.on("message:text", async (ctx) => {
    const { locale, b } = await i18n(ctx);
    const s = st(ctx);
    const text = ctx.message.text.trim();
    if (text.startsWith("/")) return;
    if (await formStep(ctx, text, b)) return;

    if (s.aiBusy) return ctx.reply(b.aiBusy);
    s.aiBusy = true;
    s.ai.push({ role: "user", content: text });
    await ctx.replyWithChatAction("typing");
    const typing = setInterval(() => ctx.replyWithChatAction("typing").catch(() => {}), 4500);
    try {
      const r = await askConsultant(s.ai, { channel: "bot", locale, tgUserId: String(ctx.from.id) });
      s.ai.push({ role: "assistant", content: r.text });
      s.ai = s.ai.slice(-20);
      await ctx.reply(r.text.slice(0, 4000), { reply_markup: mainKeyboard(b) });
    } catch (e) {
      s.ai.pop();
      console.error("[bot ai]", e instanceof Error ? e.message : e);
      await ctx.reply(e instanceof AllModelsFailedError ? b.aiDown : b.oops, { reply_markup: mainKeyboard(b) });
    } finally {
      clearInterval(typing);
      s.aiBusy = false;
    }
  });
}
