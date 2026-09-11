"use client";

import clsx from "clsx";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { useI18n } from "@/i18n/client";
import { monthName, weekdaysShort } from "@/i18n/dates";
import { addDays, isoWeekday } from "@/lib/time";

export function Calendar(p: {
  today: string;
  maxDate: string;
  availability: Record<string, number>;
  selected: string | null;
  onSelect: (date: string) => void;
  loading?: boolean;
}) {
  const { t, locale } = useI18n();
  const [month, setMonth] = useState(() => (p.selected ?? p.today).slice(0, 7));
  const maxSlots = Math.max(1, ...Object.values(p.availability));

  const cells = useMemo(() => {
    const first = `${month}-01`;
    const start = addDays(first, -(isoWeekday(first) - 1));
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
  }, [month]);

  const shift = (n: number) => {
    const [y, m] = month.split("-").map(Number);
    setMonth(new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7));
  };
  const canPrev = month > p.today.slice(0, 7);
  const canNext = month < p.maxDate.slice(0, 7);
  const [y, m] = month.split("-").map(Number);

  return (
    <div className="card p-5 sm:p-6">
      <div className="mb-5 flex items-center justify-between">
        <div className="font-display text-lg font-semibold">
          {monthName(m - 1, locale)} <span className="text-fog">{y}</span>
        </div>
        <div className="flex gap-1">
          <button disabled={!canPrev} onClick={() => shift(-1)} aria-label={t.common.back} className="grid h-9 w-9 place-items-center rounded-full border border-white/10 transition hover:border-forge/60 disabled:opacity-25">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button disabled={!canNext} onClick={() => shift(1)} aria-label={t.common.next} className="grid h-9 w-9 place-items-center rounded-full border border-white/10 transition hover:border-forge/60 disabled:opacity-25">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5 text-center">
        {weekdaysShort(locale).map((d, i) => (
          <div key={d} className={clsx("pb-2 text-[11px] font-semibold uppercase tracking-wider", i > 4 ? "text-forge/70" : "text-fog")}>
            {d}
          </div>
        ))}
        {cells.map((date) => {
          const inMonth = date.startsWith(month);
          const slots = p.availability[date] ?? 0;
          const available = inMonth && date >= p.today && slots > 0;
          const selected = date === p.selected;
          const density = slots / maxSlots;
          return (
            <button
              key={date}
              disabled={!available}
              onClick={() => p.onSelect(date)}
              className={clsx(
                "relative flex aspect-square flex-col items-center justify-center rounded-2xl text-sm transition-all duration-200",
                !inMonth && "invisible",
                selected
                  ? "scale-105 bg-gradient-to-br from-forge to-ember font-bold text-black shadow-[0_8px_30px_-6px_rgba(255,90,31,.8)]"
                  : available
                    ? "bg-white/[.04] font-semibold hover:bg-white/[.09] hover:ring-1 hover:ring-forge/50"
                    : "text-white/20",
                p.loading && "animate-pulse",
              )}
            >
              <span>{+date.slice(8)}</span>
              {date === p.today && !selected && <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-forge" />}
              {available && !selected && (
                <span className="absolute bottom-1.5 flex gap-0.5">
                  {[0.15, 0.5, 0.8].map((th) => (
                    <span key={th} className={clsx("h-1 w-1 rounded-full", density > th ? "bg-emerald-400" : "bg-white/15")} />
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-fog">
        <span className="flex items-center gap-1.5">
          <span className="flex gap-0.5">{[0, 1, 2].map((i) => <span key={i} className="h-1 w-1 rounded-full bg-emerald-400" />)}</span> {t.booking.legendFree}
        </span>
        <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-forge" /> {t.booking.legendToday}</span>
      </div>
    </div>
  );
}
