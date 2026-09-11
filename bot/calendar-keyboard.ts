import { InlineKeyboard } from "grammy";
import { addDays, isoWeekday, minToHHMM, MONTHS } from "../src/lib/time";

const WD = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

/** Календарь месяца: доступные дни — числа, недоступные — «·» */
export function calendarKeyboard(month: string, availability: Record<string, number>, today: string, maxDate: string) {
  const kb = new InlineKeyboard();
  const [y, m] = month.split("-").map(Number);
  const prev = new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 7);
  const next = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 7);

  kb.text(month > today.slice(0, 7) ? "‹" : " ", month > today.slice(0, 7) ? `cal:${prev}` : "nop")
    .text(`${MONTHS[m - 1]} ${y}`, "nop")
    .text(month < maxDate.slice(0, 7) ? "›" : " ", month < maxDate.slice(0, 7) ? `cal:${next}` : "nop")
    .row();
  for (const d of WD) kb.text(d, "nop");
  kb.row();

  const first = `${month}-01`;
  let cur = addDays(first, -(isoWeekday(first) - 1));
  for (let w = 0; w < 6; w++) {
    if (w > 0 && !cur.startsWith(month)) break;
    for (let i = 0; i < 7; i++) {
      const inMonth = cur.startsWith(month);
      const free = availability[cur] ?? 0;
      if (!inMonth) kb.text(" ", "nop");
      else if (free > 0) kb.text(String(+cur.slice(8)), `day:${cur}`);
      else kb.text("·", "nop");
      cur = addDays(cur, 1);
    }
    kb.row();
  }
  kb.text("← Назад к мастерам", "back:master");
  return kb;
}

export function timesKeyboard(times: number[]) {
  const kb = new InlineKeyboard();
  times.forEach((t, i) => {
    kb.text(minToHHMM(t), `tm:${t}`);
    if (i % 4 === 3) kb.row();
  });
  if (times.length % 4) kb.row();
  kb.text("← Другой день", "back:cal");
  return kb;
}
