// Все даты — строки YYYY-MM-DD, время — минуты от полуночи в часовом поясе ателье.
// Локализованные названия дней и месяцев — в src/i18n/dates.ts

export const BUSINESS_TZ = process.env.BUSINESS_TZ || "Asia/Tashkent";

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

/** Месяц YYYY-MM, сдвинутый на n месяцев */
export function addMonths(month: string, n: number) {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7);
}

/** 42 дня (6 недель с понедельника), покрывающие месяц YYYY-MM */
export function monthGrid(month: string) {
  const first = `${month}-01`;
  const start = addDays(first, -(isoWeekday(first) - 1));
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

export const minToHHMM = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

export const formatTimeRange = (startMin: number, endMin: number) => `${minToHHMM(startMin)}–${minToHHMM(endMin)}`;

export function hhmmToMin(s: string) {
  const [h, m] = s.split(":").map(Number);
  return h * 60 + (m || 0);
}
