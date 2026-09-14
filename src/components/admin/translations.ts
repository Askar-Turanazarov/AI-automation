import type { Locale } from "@/i18n/config";
import type { TranslateResult } from "./TranslateBar";

// Переводимые поля черновика: base (ru), baseUz, baseEn

export const suffix = (l: Locale) => (l === "ru" ? "" : l === "uz" ? "Uz" : "En");

/** Ответ TranslateBar поверх черновика: поля, которых нет в ответе, остаются как были */
export function mergeTranslations<T extends object>(draft: T, r: TranslateResult, bases: string[]): T {
  const next = { ...draft } as Record<string, unknown>;
  for (const base of bases) for (const l of ["uz", "en"] as const) next[base + suffix(l)] = r[l][base] ?? next[base + suffix(l)];
  return next as T;
}
