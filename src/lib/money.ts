import type { Locale } from "@/i18n/config";

/** Условный курс: сколько сумов в одном долларе */
export const UZS_PER_USD = Number(process.env.NEXT_PUBLIC_UZS_PER_USD) || 11900;

const NBSP = " ";
// Своя группировка разрядов — Intl для uz отличается между Node и браузерами (риск hydration mismatch)
const group = (n: number, sep: string) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, sep);

/** ru: «3 500 000 сум» · uz: «3 500 000 so'm» · en: «3,500,000 UZS» */
export function formatUZS(amount: number, locale: Locale) {
  if (locale === "en") return `${group(amount, ",")} UZS`;
  return `${group(amount, NBSP)}${NBSP}${locale === "uz" ? "so'm" : "сум"}`;
}

export const toUSD = (amount: number) => amount / UZS_PER_USD;

/** «≈ $294» */
export const formatUSD = (amount: number) => `≈${NBSP}$${group(toUSD(amount), ",")}`;

/** Короткая запись для осей графиков: ru «3,5 млн» · uz «3,5 mln» · en «3.5M» */
export function compactUZS(amount: number, locale: Locale) {
  const units = { ru: ["млрд", "млн", "тыс."], uz: ["mlrd", "mln", "ming"], en: ["B", "M", "K"] }[locale];
  const [value, unit] =
    amount >= 1e9 ? [amount / 1e9, units[0]] : amount >= 1e6 ? [amount / 1e6, units[1]] : amount >= 1e3 ? [amount / 1e3, units[2]] : [amount, ""];
  const num = String(+value.toFixed(1));
  if (!unit) return num;
  return locale === "en" ? `${num}${unit}` : `${num.replace(".", ",")}${NBSP}${unit}`;
}

/** Сумма + доллары одной строкой (для бота и уведомлений) */
export const formatPriceLine = (amount: number, locale: Locale) => `${formatUZS(amount, locale)} (${formatUSD(amount)})`;
