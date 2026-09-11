"use client";

import clsx from "clsx";
import { CalendarCheck, CalendarDays, Gauge, Receipt, Wallet, XCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Avatar } from "@/components/ui";
import { formatDateRu, formatPrice, weekdayShort } from "@/lib/time";

type Data = {
  today: string;
  kpi: { bookingsToday: number; bookingsWeek: number; revenueMonth: number; avgCheck: number; loadWeek: number; cancelRate: number };
  workloadWeek: { id: string; name: string; specialty: string; color: string; bookings: number; bookedMin: number; workMin: number; load: number; revenue: number }[];
  series: { date: string; bookings: number; revenue: number; future: boolean }[];
  heat: Record<string, number>;
  sources: { source: string; count: number }[];
  upcoming: { id: string; when: string; service: string; master: string; color: string; client: string; car: string; source: string }[];
};

// Палитра проверена validate_palette.js для тёмной поверхности #111115
const ACCENT = "#E0521D";
const SOURCE_META: Record<string, { label: string; color: string }> = {
  web: { label: "Сайт", color: "#E0521D" },
  bot: { label: "Telegram-бот", color: "#1F9FB5" },
  ai: { label: "ИИ-ассистент", color: "#8E72E6" },
};
const compact = (n: number) => (n >= 1_000_000 ? `${+(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${Math.round(n / 1000)}k` : String(n));

function Kpi({ icon: Icon, label, value, hint, meter }: { icon: typeof Wallet; label: string; value: string; hint?: string; meter?: number }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-fog">
        <Icon className="h-4 w-4 text-forge" /> {label}
      </div>
      <div className="mt-3 font-display text-2xl font-bold tabular-nums sm:text-3xl">{value}</div>
      {meter != null && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[.06]">
          <div className="h-full rounded-full" style={{ width: `${Math.min(100, meter)}%`, background: ACCENT }} />
        </div>
      )}
      {hint && <div className="mt-2 text-xs text-fog">{hint}</div>}
    </div>
  );
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: { payload: Data["series"][number] }[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-xl border border-white/10 bg-ink/95 px-3 py-2 text-xs shadow-xl backdrop-blur">
      <div className="font-semibold text-bone">{formatDateRu(p.date)}{p.future ? " · запланировано" : ""}</div>
      <div className="mt-1 text-fog">Выручка: <span className="text-bone tabular-nums">{formatPrice(p.revenue)}</span></div>
      <div className="text-fog">Записей: <span className="text-bone tabular-nums">{p.bookings}</span></div>
    </div>
  );
}

export function Dashboard({ data }: { data: Data }) {
  const { kpi } = data;
  const [hover, setHover] = useState<string | null>(null);
  const hours = Array.from({ length: 13 }, (_, i) => i + 9); // 9:00–21:00
  const heatMax = Math.max(1, ...Object.values(data.heat));
  const srcTotal = data.sources.reduce((a, s) => a + s.count, 0) || 1;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Kpi icon={CalendarCheck} label="Сегодня" value={String(kpi.bookingsToday)} hint="записей" />
        <Kpi icon={CalendarDays} label="7 дней" value={String(kpi.bookingsWeek)} hint="записей впереди" />
        <Kpi icon={Wallet} label="Выручка" value={formatPrice(kpi.revenueMonth)} hint="с начала месяца" />
        <Kpi icon={Receipt} label="Средний чек" value={formatPrice(kpi.avgCheck)} hint="в этом месяце" />
        <Kpi icon={Gauge} label="Загрузка" value={`${kpi.loadWeek}%`} hint="на 7 дней вперёд" meter={kpi.loadWeek} />
        <Kpi icon={XCircle} label="Отмены" value={`${kpi.cancelRate}%`} hint="за 4 недели" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="card p-5 sm:p-6">
          <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-sm font-semibold">Выручка по дням</h2>
            <div className="flex items-center gap-4 text-xs text-fog">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: ACCENT }} /> факт</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm border" style={{ borderColor: ACCENT, background: `repeating-linear-gradient(45deg, ${ACCENT}66 0 2px, transparent 2px 4px)` }} /> запланировано</span>
            </div>
          </div>
          <p className="mb-4 text-xs text-fog">4 недели назад → 7 дней вперёд</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.series} barCategoryGap={2} margin={{ top: 4, right: 0, left: -12, bottom: 0 }}>
                <defs>
                  <pattern id="planned" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                    <rect width="4" height="4" fill={`${ACCENT}33`} />
                    <line x1="0" y1="0" x2="0" y2="4" stroke={ACCENT} strokeWidth="2" />
                  </pattern>
                </defs>
                <CartesianGrid vertical={false} stroke="rgba(255,255,255,.05)" />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  interval={6}
                  tick={{ fill: "#8b8b98", fontSize: 11 }}
                  tickFormatter={(d: string) => formatDateRu(d, false)}
                />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: "#8b8b98", fontSize: 11 }} tickFormatter={compact} width={48} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,.04)" }} />
                <Bar dataKey="revenue" radius={[4, 4, 0, 0]} maxBarSize={22}>
                  {data.series.map((d) => (
                    <Cell key={d.date} fill={d.future ? "url(#planned)" : ACCENT} stroke={d.date === data.today ? "#ededf0" : undefined} strokeWidth={d.date === data.today ? 1 : 0} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-display text-sm font-semibold">Загрузка мастеров · 7 дней</h2>
            <Link href="/admin/masters" className="text-xs text-fog hover:text-bone">Управлять →</Link>
          </div>
          <div className="space-y-5">
            {data.workloadWeek.map((m) => (
              <div key={m.id} className="group">
                <div className="mb-2 flex items-center gap-3">
                  <Avatar name={m.name} color={m.color} size={32} className="!rounded-lg" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{m.name}</div>
                    <div className="truncate text-xs text-fog">{m.bookings} записей · {Math.round(m.bookedMin / 60)} / {Math.round(m.workMin / 60)} ч · {formatPrice(m.revenue)}</div>
                  </div>
                  <div className="font-display text-lg font-semibold tabular-nums">{m.load}%</div>
                </div>
                <div className="relative h-2 overflow-hidden rounded-full bg-white/[.06]">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(100, m.load)}%`, background: m.color }} />
                  <div className="absolute top-0 bottom-0 w-px bg-white/30" style={{ left: "80%" }} title="Целевая загрузка 80%" />
                </div>
              </div>
            ))}
            {!data.workloadWeek.length && <p className="text-sm text-fog">Добавьте мастеров</p>}
          </div>
          <p className="mt-5 text-xs text-fog">Черта — ориентир 80%. Ниже — есть свободные окна для рекламы и акций.</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="card p-5 sm:p-6">
          <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-sm font-semibold">Пиковые часы</h2>
            <span className="text-xs text-fog tabular-nums">{hover ? (() => { const [wd, h] = hover.split("-").map(Number); return `${weekdayShort(wd)} ${h}:00 — ${data.heat[hover] ?? 0} занятых боксов`; })() : "Наведите на ячейку"}</span>
          </div>
          <p className="mb-4 text-xs text-fog">Занятость боксов по дням недели и часам, последние 4 недели и неделя вперёд</p>
          <div className="overflow-x-auto">
            <div className="inline-grid min-w-full gap-[2px]" style={{ gridTemplateColumns: `28px repeat(${hours.length}, minmax(28px, 1fr))` }}>
              <span />
              {hours.map((h) => <span key={h} className="pb-1 text-center text-[10px] text-fog tabular-nums">{h}</span>)}
              {[1, 2, 3, 4, 5, 6, 7].map((wd) => (
                <div key={wd} className="contents">
                  <span className="self-center text-[11px] text-fog">{weekdayShort(wd)}</span>
                  {hours.map((h) => {
                    const key = `${wd}-${h}`;
                    const v = data.heat[key] ?? 0;
                    const pct = v ? 18 + Math.round((v / heatMax) * 82) : 0;
                    return (
                      <div
                        key={key}
                        onMouseEnter={() => setHover(key)}
                        onMouseLeave={() => setHover(null)}
                        className={clsx("h-7 rounded-[4px] transition", hover === key && "ring-2 ring-bone")}
                        style={{ background: v ? `color-mix(in oklab, ${ACCENT} ${pct}%, #1a1a20)` : "rgba(255,255,255,.03)" }}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-[11px] text-fog">
            меньше
            {[0, 25, 50, 75, 100].map((p) => <span key={p} className="h-3 w-5 rounded-[3px]" style={{ background: p ? `color-mix(in oklab, ${ACCENT} ${18 + p * 0.82}%, #1a1a20)` : "rgba(255,255,255,.03)" }} />)}
            больше
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-5 sm:p-6">
            <h2 className="mb-4 font-display text-sm font-semibold">Откуда записи · 4 недели</h2>
            <div className="flex h-3 gap-[2px] overflow-hidden rounded-full">
              {data.sources.filter((s) => s.count).map((s) => (
                <div key={s.source} className="h-full first:rounded-l-full last:rounded-r-full" style={{ width: `${(s.count / srcTotal) * 100}%`, background: SOURCE_META[s.source]?.color }} title={`${SOURCE_META[s.source]?.label}: ${s.count}`} />
              ))}
            </div>
            <div className="mt-4 space-y-2">
              {data.sources.map((s) => (
                <div key={s.source} className="flex items-center gap-2 text-sm">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ background: SOURCE_META[s.source]?.color }} />
                  <span className="flex-1 text-fog">{SOURCE_META[s.source]?.label ?? s.source}</span>
                  <span className="tabular-nums">{s.count}</span>
                  <span className="w-10 text-right text-xs text-fog tabular-nums">{Math.round((s.count / srcTotal) * 100)}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-sm font-semibold">Ближайшие записи</h2>
              <Link href="/admin/bookings" className="text-xs text-fog hover:text-bone">Все →</Link>
            </div>
            <div className="space-y-3">
              {data.upcoming.map((b) => (
                <div key={b.id} className="flex items-center gap-3 text-sm">
                  <span className="h-8 w-1 shrink-0 rounded-full" style={{ background: b.color }} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{b.service}</div>
                    <div className="truncate text-xs text-fog">{b.client} · {b.master.split(" ")[0]}{b.car && ` · ${b.car}`}</div>
                  </div>
                  <div className="shrink-0 text-right text-xs text-fog tabular-nums">{b.when}</div>
                </div>
              ))}
              {!data.upcoming.length && <p className="text-sm text-fog">Нет предстоящих записей</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
