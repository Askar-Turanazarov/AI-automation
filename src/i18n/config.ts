export const locales = ["ru", "uz", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "ru";
export const LOCALE_COOKIE = "NEXT_LOCALE";

export const isLocale = (v: unknown): v is Locale => typeof v === "string" && (locales as readonly string[]).includes(v);

/** Сохранённый выбор → язык браузера (первый поддерживаемый) → русский */
export function detectLocale(cookie?: string | null, acceptLanguage?: string | null): Locale {
  if (isLocale(cookie)) return cookie;
  for (const part of (acceptLanguage ?? "").split(",")) {
    const code = part.split(";")[0].trim().toLowerCase().slice(0, 2);
    if (isLocale(code)) return code;
  }
  return defaultLocale;
}

export const localeFromTelegram = (code?: string | null): Locale => (code?.startsWith("uz") ? "uz" : code?.startsWith("en") ? "en" : "ru");

export const LANGUAGE_NAMES: Record<Locale, string> = { ru: "Русский", uz: "O'zbekcha", en: "English" };
