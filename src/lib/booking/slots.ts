type Interval = { start: number; end: number };

const SLOT_STEP = 30;

/**
 * Свободные времена начала внутри рабочего интервала с учётом занятых интервалов.
 * notBefore — отсекает прошедшее время (для «сегодня»).
 */
export function computeFreeStarts(opts: {
  work: Interval | null;
  busy: Interval[];
  duration: number;
  step?: number;
  notBefore?: number;
}): number[] {
  const { work, busy, duration, step = SLOT_STEP, notBefore = -1 } = opts;
  if (!work || duration <= 0) return [];
  const out: number[] = [];
  for (let t = work.start; t + duration <= work.end; t += step) {
    if (t < notBefore) continue;
    const end = t + duration;
    if (busy.every((b) => end <= b.start || t >= b.end)) out.push(t);
  }
  return out;
}

export const overlaps = (a: Interval, b: Interval) => a.start < b.end && b.start < a.end;
