// Все даты — строки YYYY-MM-DD, время — минуты от полуночи в часовом поясе ателье.

export const BUSINESS_TZ = process.env.BUSINESS_TZ || "Asia/Almaty";

const WEEKDAYS_SHORT = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
export const WEEKDAYS_FULL = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"];
const MONTHS_GEN = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
export const MONTHS = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];

function partsInTz(d = new Date()) {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  const get = (t: string) => p.find((x) => x.type === t)!.value;
  return { date: `${get("year")}-${get("month")}-${get("day")}`, minutes: +get("hour") * 60 + +get("minute") };
}

export const todayISO = () => partsInTz().date;
export const nowMinutes = () => partsInTz().minutes;

const toUTC = (date: string) => new Date(`${date}T00:00:00Z`);

/** 1 = Пн … 7 = Вс */
export function isoWeekday(date: string) {
  const d = toUTC(date).getUTCDay();
  return d === 0 ? 7 : d;
}

export function addDays(date: string, n: number) {
  const d = toUTC(date);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(a: string, b: string) {
  return Math.round((toUTC(b).getTime() - toUTC(a).getTime()) / 86_400_000);
}

export const minToHHMM = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

export function hhmmToMin(s: string) {
  const [h, m] = s.split(":").map(Number);
  return h * 60 + (m || 0);
}

export function formatDateRu(date: string, withWeekday = true) {
  const d = toUTC(date);
  const base = `${d.getUTCDate()} ${MONTHS_GEN[d.getUTCMonth()]}`;
  return withWeekday ? `${WEEKDAYS_SHORT[isoWeekday(date) - 1]}, ${base}` : base;
}

export const weekdayShort = (wd: number) => WEEKDAYS_SHORT[wd - 1];

export const formatPrice = (n: number) => `${n.toLocaleString("ru-RU")} ₸`;
