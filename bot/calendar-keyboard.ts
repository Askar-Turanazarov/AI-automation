import { InlineKeyboard } from "grammy";
import type { Dict } from "../src/i18n";
import type { Locale } from "../src/i18n/config";
import { monthName, weekdaysShort } from "../src/i18n/dates";
import { addMonths, minToHHMM, monthGrid } from "../src/lib/time";

/** Календарь месяца: доступные дни — числа, недоступные — «·» */
export function calendarKeyboard(
  month: string,
  availability: Record<string, number>,
  today: string,
  maxDate: string,
  locale: Locale,
  b: Dict["bot"],
) {
  const kb = new InlineKeyboard();
  const [y, m] = month.split("-").map(Number);
  const canPrev = month > today.slice(0, 7);
  const canNext = month < maxDate.slice(0, 7);

  kb.text(canPrev ? "‹" : " ", canPrev ? `cal:${addMonths(month, -1)}` : "nop")
    .text(`${monthName(m - 1, locale)} ${y}`, "nop")
    .text(canNext ? "›" : " ", canNext ? `cal:${addMonths(month, 1)}` : "nop")
    .row();
  for (const d of weekdaysShort(locale)) kb.text(d, "nop");
  kb.row();

  const grid = monthGrid(month);
  for (let w = 0; w < grid.length; w += 7) {
    // неделя, целиком за пределами месяца, не рисуется
    if (w > 0 && !grid[w].startsWith(month)) break;
    for (const day of grid.slice(w, w + 7)) {
      if (!day.startsWith(month)) kb.text(" ", "nop");
      else if ((availability[day] ?? 0) > 0) kb.text(String(+day.slice(8)), `day:${day}`);
      else kb.text("·", "nop");
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
