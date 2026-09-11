import type { Locale } from "./config";
import en from "./dictionaries/en";
import ru, { type Dict } from "./dictionaries/ru";
import uz from "./dictionaries/uz";

export type { Dict };
export const dictionaries: Record<Locale, Dict> = { ru, uz, en };
export const getDict = (locale: Locale): Dict => dictionaries[locale];

/** Подстановка {переменных} в строку словаря */
export const tpl = (s: string, vars: Record<string, string | number>) =>
  s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
