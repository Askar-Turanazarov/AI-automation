import type { Locale } from "@/i18n/config";

// Локализация данных из БД: пустой перевод → русский текст

const pick = (ru: string, uz: string | undefined, en: string | undefined, locale: Locale) =>
  (locale === "uz" ? uz : locale === "en" ? en : "") || ru;

type ServiceText = { name: string; nameUz?: string; nameEn?: string; category: string; categoryUz?: string; categoryEn?: string; description: string; descriptionUz?: string; descriptionEn?: string };
type MasterText = { name: string; nameLatin?: string; specialty: string; specialtyUz?: string; specialtyEn?: string; bio: string; bioUz?: string; bioEn?: string };

export function localizeService<T extends ServiceText>(s: T, locale: Locale): T {
  return {
    ...s,
    name: pick(s.name, s.nameUz, s.nameEn, locale),
    category: pick(s.category, s.categoryUz, s.categoryEn, locale),
    description: pick(s.description, s.descriptionUz, s.descriptionEn, locale),
  };
}

export function localizeMaster<T extends MasterText>(m: T, locale: Locale): T {
  return {
    ...m,
    name: localizedName(m, locale),
    specialty: pick(m.specialty, m.specialtyUz, m.specialtyEn, locale),
    bio: pick(m.bio, m.bioUz, m.bioEn, locale),
  };
}

export const localizedName = (m: { name: string; nameLatin?: string }, locale: Locale) => (locale === "ru" ? m.name : m.nameLatin || m.name);
