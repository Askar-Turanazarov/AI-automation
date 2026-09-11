"use client";

import clsx from "clsx";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { addDays, isoWeekday, MONTHS } from "@/lib/time";

const WD = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export function Calendar(p: {
  today: string;
  maxDate: string;
  availability: Record<string, number>;
  selected: string | null;
  onSelect: (date: string) => void;
  loading?: boolean;
}) {
  const [month, setMonth] = useState(() => (p.selected ?? p.today).slice(0, 7));
  const maxSlots = Math.max(1, ...Object.values(p.availability));

  const cells = useMemo(() => {
    const first = `${month}-01`;
    const lead = isoWeekday(first) - 1;
    const start = addDays(first, -lead);
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
  }, [month]);

  const shift = (n: number) => {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(Date.UTC(y, m - 1 + n, 1));
    setMonth(d.toISOString().slice(0, 7));
  };
  const canPrev = month > p.today.slice(0, 7);
  const canNext = month < p.maxDate.slice(0, 7);
  const [y, m] = month.split("-").map(Number);

  return (
    <div className="card p-5 sm:p-6">
      <div className="mb-5 flex items-center justify-between">
        <div className="font-display text-lg font-semibold">
          {MONTHS[m - 1]} <span className="text-fog">{y}</span>
        </div>
        <div className="flex gap-1">
          {[[-1, canPrev, ChevronLeft], [1, canNext, ChevronRight]].map(([n, can, Icon]) => {
            const I = Icon as typeof ChevronLeft;
            return (
              <button
                key={n as number}
                disabled={!can}
                onClick={() => shift(n as number)}
                className="grid h-9 w-9 place-items-center rounded-full border border-white/10 transition hover:border-forge/60 disabled:opacity-25"
              >
                <I className="h-4 w-4" />
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5 text-center">
        {WD.map((d, i) => (
          <div key={d} className={clsx("pb-2 text-[11px] font-semibold uppercase tracking-wider", i > 4 ? "text-forge/70" : "text-fog")}>
            {d}
          </div>
        ))}
        {cells.map((date) => {
          const inMonth = date.startsWith(month);
          const slots = p.availability[date] ?? 0;
          const past = date < p.today;
          const available = inMonth && !past && slots > 0;
          const selected = date === p.selected;
          const isToday = date === p.today;
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
              {isToday && !selected && <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-forge" />}
              {available && !selected && (
                <span className="absolute bottom-1.5 flex gap-0.5">
                  {[0.15, 0.5, 0.8].map((t) => (
                    <span key={t} className={clsx("h-1 w-1 rounded-full", density > t ? "bg-emerald-400" : "bg-white/15")} />
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="mt-4 flex items-center gap-4 text-xs text-fog">
        <span className="flex items-center gap-1.5"><span className="flex gap-0.5">{[1, 1, 1].map((_, i) => <span key={i} className="h-1 w-1 rounded-full bg-emerald-400" />)}</span> много свободного времени</span>
        <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-forge" /> сегодня</span>
      </div>
    </div>
  );
}
