import { Keyboard, type Context, type InlineKeyboard } from "grammy";
import { getDict, type Dict } from "../src/i18n";
import type { Locale } from "../src/i18n/config";

import { miniAppUrl } from "../src/lib/telegram/webapp";

export { MINIAPP_BASE, miniAppUrl } from "../src/lib/telegram/webapp";

export const mainKeyboard = (b: Dict["bot"]) =>
  new Keyboard().text(b.btnBook).text(b.btnMy).row().text(b.btnAi).text(b.btnLang).resized().persistent();

/** Нажатие inline-кнопки — правим сообщение, иначе отправляем новое */
export async function edit(ctx: Context, text: string, reply_markup?: InlineKeyboard) {
  if (ctx.callbackQuery) {
    await ctx
      .editMessageText(text, { reply_markup, parse_mode: "HTML" })
      .catch(() => ctx.reply(text, { reply_markup, parse_mode: "HTML" }));
  } else {
    await ctx.reply(text, { reply_markup, parse_mode: "HTML" });
  }
}

export async function setMenuButton(ctx: Context, locale: Locale) {
  const url = miniAppUrl(locale);
  if (!url || !ctx.chat) return;
  await ctx.api
    .setChatMenuButton({ chat_id: ctx.chat.id, menu_button: { type: "web_app", text: getDict(locale).bot.menuButton, web_app: { url } } })
    .catch(() => {});
}
