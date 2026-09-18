import type { Locale } from "@/i18n/config";

// Контакты ателье (вымышленный адрес) — отредактируйте под себя
const BASE = {
  name: "Octane Forge",
  phone: "+998 71 200 17 17",
  instagram: "octane.forge.uz",
  telegramBot: "octaneai_auto_bot",
  // ссылка на карточку в Google Maps / 2GIS: после хорошей оценки бот предложит оставить отзыв там. Пусто — кнопки нет
  mapsUrl: "",
};

const LOCALIZED: Record<Locale, { tagline: string; city: string; address: string; hours: string; warranty: string }> = {
  ru: {
    tagline: "Тюнинг-ателье полного цикла",
    city: "Ташкент",
    address: "г. Ташкент, Мирзо-Улугбекский район, ул. Турбо, 17 (ориентир: ТЦ «Магистраль»)",
    hours: "Пн–Сб 09:00–20:00, Вс — выходной",
    warranty: "Гарантия на все работы — 12 месяцев",
  },
  uz: {
    tagline: "To'liq tsiklli tyuning atelyesi",
    city: "Toshkent",
    address: "Toshkent sh., Mirzo Ulug'bek tumani, Turbo ko'chasi, 17-uy (mo'ljal: «Magistral» savdo markazi)",
    hours: "Du–Sh 09:00–20:00, yakshanba — dam olish kuni",
    warranty: "Barcha ishlarga 12 oylik kafolat",
  },
  en: {
    tagline: "Full-service tuning atelier",
    city: "Tashkent",
    address: "17 Turbo Street, Mirzo Ulugbek District, Tashkent (landmark: Magistral Mall)",
    hours: "Mon–Sat 09:00–20:00, closed on Sundays",
    warranty: "12-month warranty on all work",
  },
};

export const BUSINESS = BASE;
export const businessInfo = (locale: Locale) => ({ ...BASE, ...LOCALIZED[locale] });
