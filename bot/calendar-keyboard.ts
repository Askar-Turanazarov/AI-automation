import { InlineKeyboard } from "grammy";
import type { Dict } from "../src/i18n";
import type { Locale } from "../src/i18n/config";
import { monthName, weekdaysShort } from "../src/i18n/dates";
import { addDays, isoWeekday, minToHHMM } from "../src/lib/time";

/** Календарь месяца: доступные дни — числа, недоступные — «·» */
export function calendarKeyboard(month: string, availability: Record<string, number>, today: string, maxDate: string, locale: Locale, b: Dict["bot"]) {
  const kb = new InlineKeyboard();
  const [y, m] = month.split("-").map(Number);
  const prev = new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 7);
  const next = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 7);
  const canPrev = month > today.slice(0, 7);
  const canNext = month < maxDate.slice(0, 7);

  kb.text(canPrev ? "‹" : " ", canPrev ? `cal:${prev}` : "nop")
    .text(`${monthName(m - 1, locale)} ${y}`, "nop")
    .text(canNext ? "›" : " ", canNext ? `cal:${next}` : "nop")
    .row();
  for (const d of weekdaysShort(locale)) kb.text(d, "nop");
  kb.row();

  const first = `${month}-01`;
  let cur = addDays(first, -(isoWeekday(first) - 1));
  for (let w = 0; w < 6; w++) {
    if (w > 0 && !cur.startsWith(month)) break;
    for (let i = 0; i < 7; i++) {
      const inMonth = cur.startsWith(month);
      if (!inMonth) kb.text(" ", "nop");
      else if ((availability[cur] ?? 0) > 0) kb.text(String(+cur.slice(8)), `day:${cur}`);
      else kb.text("·", "nop");
      cur = addDays(cur, 1);
    }
    kb.row();
  }
  kb.text(b.backMasters, "back:master");
  return kb;
}

export function timesKeyboard(times: number[], b: Dict["bot"]) {
  const kb = new InlineKeyboard();
  times.forEach((t, i) => {
    kb.text(minToHHMM(t), `tm:${t}`);
    if (i % 4 === 3) kb.row();
  });
  if (times.length % 4) kb.row();
  kb.text(b.otherDay, "back:cal");
  return kb;
}
