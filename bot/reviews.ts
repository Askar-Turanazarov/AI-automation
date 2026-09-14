import { InlineKeyboard, type Bot, type Context } from "grammy";
import type { Dict } from "../src/i18n";
import { BUSINESS } from "../src/lib/business";
import { saveRating } from "../src/lib/reviews";
import { i18n } from "./locale";
import { st } from "./state";

/** Благодарность за отзыв + кнопка отзыва на картах, если ссылка задана */
export async function reviewThanks(ctx: Context, b: Dict["bot"]) {
  await ctx.reply(b.reviewThanks, {
    reply_markup: BUSINESS.mapsUrl ? new InlineKeyboard().url(b.reviewMaps, BUSINESS.mapsUrl) : undefined,
  });
}

// ---------- оценка после визита ----------
export function registerReviews(bot: Bot) {
  bot.callbackQuery(/^rate:(.+):([1-5])$/, async (ctx) => {
    const { b } = await i18n(ctx);
    const rating = Number(ctx.match[2]);
    const review = await saveRating(ctx.match[1], String(ctx.from.id), rating);
    if (!review) return ctx.answerCallbackQuery({ text: b.rsvpFailed });
    await ctx.answerCallbackQuery({ text: "⭐".repeat(rating) });
    await ctx.editMessageReplyMarkup().catch(() => {});
    if (rating <= 3) return ctx.reply(b.reviewSorry);
    // следующий текст пользователя станет отзывом (шаг формы в bot/booking.ts)
    Object.assign(st(ctx).draft, { await: "review", reviewId: review.id });
    await ctx.reply(b.reviewAskText, { reply_markup: new InlineKeyboard().text(b.skip, "review:skip") });
  });

  bot.callbackQuery("review:skip", async (ctx) => {
    const { b } = await i18n(ctx);
    const d = st(ctx).draft;
    d.await = undefined;
    d.reviewId = undefined;
    await ctx.answerCallbackQuery();
    await ctx.editMessageReplyMarkup().catch(() => {});
    await reviewThanks(ctx, b);
  });
}
