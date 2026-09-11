import { isoWeekday } from "@/lib/time";
import type { Locale } from "./config";

const WEEKDAYS_SHORT: Record<Locale, string[]> = {
  ru: ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"],
  uz: ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"],
  en: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
};
const WEEKDAYS: Record<Locale, string[]> = {
  ru: ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"],
  uz: ["Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba", "Yakshanba"],
  en: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
};
const MONTHS: Record<Locale, string[]> = {
  ru: ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"],
  uz: ["Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun", "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"],
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
};
const MONTHS_IN_DATE: Record<Locale, string[]> = {
  ru: ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"],
  uz: MONTHS.uz.map((m) => m.toLowerCase()),
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
};

export const weekdayShort = (wd: number, locale: Locale) => WEEKDAYS_SHORT[locale][wd - 1];
export const weekdayFull = (wd: number, locale: Locale) => WEEKDAYS[locale][wd - 1];
export const weekdaysShort = (locale: Locale) => WEEKDAYS_SHORT[locale];
export const monthName = (monthIndex: number, locale: Locale) => MONTHS[locale][monthIndex];

/** ru: «Пт, 11 сентября» · uz: «11-sentabr, juma» · en: «Fri, Sep 11» */
export function formatDate(date: string, locale: Locale, withWeekday = true) {
  const day = +date.slice(8, 10);
  const m = +date.slice(5, 7) - 1;
  const wd = isoWeekday(date);
  if (locale === "uz") return `${day}-${MONTHS_IN_DATE.uz[m]}${withWeekday ? `, ${WEEKDAYS.uz[wd - 1].toLowerCase()}` : ""}`;
  if (locale === "en") return `${withWeekday ? `${WEEKDAYS_SHORT.en[wd - 1]}, ` : ""}${MONTHS_IN_DATE.en[m]} ${day}`;
  return `${withWeekday ? `${WEEKDAYS_SHORT.ru[wd - 1]}, ` : ""}${day} ${MONTHS_IN_DATE.ru[m]}`;
}
