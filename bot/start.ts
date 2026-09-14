import { InlineKeyboard, type Bot, type Context } from "grammy";
import { getDict, tpl } from "../src/i18n";
import type { Locale } from "../src/i18n/config";
import { businessInfo } from "../src/lib/business";
import { allLabels, i18n, saveLocale } from "./locale";
import { states } from "./state";
import { mainKeyboard, miniAppUrl, setMenuButton } from "./ui";

async function showLanguages(ctx: Context) {
  const { b } = await i18n(ctx);
  await ctx.reply(b.langPick, {
    reply_markup: new InlineKeyboard().text("🇷🇺 Русский", "lang:ru").text("🇺🇿 O'zbekcha", "lang:uz").text("🇬🇧 English", "lang:en"),
  });
}

// ---------- старт, язык, помощь ----------
export function registerStart(bot: Bot) {
  bot.command("start", async (ctx) => {
    states.delete(ctx.chat.id);
    const { locale, b } = await i18n(ctx);
    await ctx.reply(b.welcome, { parse_mode: "HTML", reply_markup: mainKeyboard(b) });
    const url = miniAppUrl(locale);
    if (url) {
      await ctx.reply(b.miniApp, { reply_markup: new InlineKeyboard().webApp(b.miniAppBtn, url) });
      await setMenuButton(ctx, locale);
    }
  });

  bot.command("lang", showLanguages);
  bot.hears(allLabels("btnLang"), showLanguages);

  bot.callbackQuery(/^lang:(ru|uz|en)$/, async (ctx) => {
    const locale = ctx.match[1] as Locale;
    await saveLocale(String(ctx.from.id), locale);
    const b = getDict(locale).bot;
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(b.langSet).catch(() => {});
    await ctx.reply(b.welcome, { parse_mode: "HTML", reply_markup: mainKeyboard(b) });
    await setMenuButton(ctx, locale);
  });

  bot.command("id", (ctx) => ctx.reply(`chat_id: <code>${ctx.chat.id}</code>`, { parse_mode: "HTML" }));

  bot.command("help", async (ctx) => {
    const { locale, b } = await i18n(ctx);
    const biz = businessInfo(locale);
    await ctx.reply(tpl(b.help, { address: biz.address, hours: biz.hours, phone: biz.phone }));
  });
}
