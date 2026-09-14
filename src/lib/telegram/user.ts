import { isLocale, type Locale } from "@/i18n/config";
import { prisma } from "@/lib/db";

/** Запоминает пользователя Telegram; уже выбранный язык не перезаписывается */
export const ensureTelegramUser = (id: string, locale: Locale) =>
  prisma.telegramUser.upsert({ where: { id }, create: { id, locale }, update: {} });

/** Язык пользователя Telegram; по умолчанию — русский */
export async function telegramLocale(tgUserId?: string | null): Promise<Locale> {
  if (!tgUserId) return "ru";
  const u = await prisma.telegramUser.findUnique({ where: { id: tgUserId } });
  return isLocale(u?.locale) ? u.locale : "ru";
}
