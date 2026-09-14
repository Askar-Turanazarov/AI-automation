import type { Context } from "grammy";
import { dictionaries, getDict, type Dict } from "../src/i18n";
import { isLocale, localeFromTelegram, locales, type Locale } from "../src/i18n/config";
import { prisma } from "../src/lib/db";
import { ensureTelegramUser } from "../src/lib/telegram/user";

// ---------- язык пользователя: сохранённый выбор → язык Telegram ----------
const localeCache = new Map<string, Locale>();

async function getLocale(ctx: Context): Promise<Locale> {
  const id = String(ctx.from?.id ?? ctx.chat?.id);
  const cached = localeCache.get(id);
  if (cached) return cached;
  const saved = await prisma.telegramUser.findUnique({ where: { id } });
  const locale = isLocale(saved?.locale) ? saved.locale : localeFromTelegram(ctx.from?.language_code);
  if (!saved) await ensureTelegramUser(id, locale).catch(() => {});
  localeCache.set(id, locale);
  return locale;
}

/** Явный выбор языка через /lang */
export async function saveLocale(id: string, locale: Locale) {
  await prisma.telegramUser.upsert({ where: { id }, create: { id, locale }, update: { locale } });
  localeCache.set(id, locale);
}

export async function i18n(ctx: Context) {
  const locale = await getLocale(ctx);
  const t = getDict(locale);
  return { locale, t, b: t.bot };
}

/** Текст кнопки на всех трёх языках — чтобы кнопки работали после смены языка */
export const allLabels = (key: keyof Dict["bot"]) => locales.map((l) => dictionaries[l].bot[key]);
