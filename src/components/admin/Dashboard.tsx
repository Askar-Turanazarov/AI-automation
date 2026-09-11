"use client";

import clsx from "clsx";
import { CalendarCheck, CalendarDays, Gauge, Receipt, Wallet, XCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Price } from "@/components/Price";
import { Avatar } from "@/components/ui";
import { tpl } from "@/i18n";
import { useI18n } from "@/i18n/client";
import { formatDate, weekdayShort } from "@/i18n/dates";
import { compactUZS, formatUSD, formatUZS } from "@/lib/money";

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
const SOURCE_COLORS: Record<string, string> = { web: "#E0521D", bot: "#1F9FB5", ai: "#8E72E6" };

function Kpi({ icon: Icon, label, value, hint, meter }: { icon: typeof Wallet; label: string; value: React.ReactNode; hint?: string; meter?: number }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-fog">
        <Icon className="h-4 w-4 text-forge" /> {label}
      </div>
      <div className="mt-3 font-display text-2xl font-bold tabular-nums">{value}</div>
      {meter != null && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[.06]">
          <div className="h-full rounded-full" style={{ width: `${Math.min(100, meter)}%`, background: ACCENT }} />
        </div>
      )}
      {hint && <div className="mt-2 text-xs text-fog">{hint}</div>}
    </div>
  );
}

export function Dashboard({ data }: { data: Data }) {
  const { t, locale } = useI18n();
  const d = t.admin.dashboard;
  const { kpi } = data;
  const [hover, setHover] = useState<string | null>(null);
  const hours = Array.from({ length: 13 }, (_, i) => i + 9); // 9:00–21:00
  const heatMax = Math.max(1, ...Object.values(data.heat));
  const srcTotal = data.sources.reduce((a, s) => a + s.count, 0) || 1;
  const sourceLabel = (s: string) => t.admin.sources[s as keyof typeof t.admin.sources] ?? s;

  function ChartTooltip({ active, payload }: { active?: boolean; payload?: { payload: Data["series"][number] }[] }) {
    if (!active || !payload?.length) return null;
    const p = payload[0].payload;
    return (
      <div className="rounded-xl border border-white/10 bg-ink/95 px-3 py-2 text-xs shadow-xl backdrop-blur">
        <div className="font-semibold text-bone">{formatDate(p.date, locale)}{p.future ? ` · ${d.planned}` : ""}</div>
        <div className="mt-1 text-fog">{d.ttRevenue}: <span className="text-bone tabular-nums">{formatUZS(p.revenue, locale)}</span> <span className="tabular-nums">{formatUSD(p.revenue)}</span></div>
        <div className="text-fog">{d.ttBookings}: <span className="text-bone tabular-nums">{p.bookings}</span></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 2xl:grid-cols-6">
        <Kpi icon={CalendarCheck} label={d.kToday} value={kpi.bookingsToday} hint={d.kTodayHint} />
        <Kpi icon={CalendarDays} label={d.kWeek} value={kpi.bookingsWeek} hint={d.kWeekHint} />
        <Kpi icon={Wallet} label={d.kRevenue} value={<Price amount={kpi.revenueMonth} locale={locale} mainClassName="text-xl" />} hint={d.kRevenueHint} />
        <Kpi icon={Receipt} label={d.kAvg} value={<Price amount={kpi.avgCheck} locale={locale} mainClassName="text-xl" />} hint={d.kAvgHint} />
        <Kpi icon={Gauge} label={d.kLoad} value={`${kpi.loadWeek}%`} hint={d.kLoadHint} meter={kpi.loadWeek} />
        <Kpi icon={XCircle} label={d.kCancel} value={`${kpi.cancelRate}%`} hint={d.kCancelHint} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="card p-5 sm:p-6">
          <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-sm font-semibold">{d.revenueTitle}</h2>
            <div className="flex items-center gap-4 text-xs text-fog">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: ACCENT }} /> {d.fact}</span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm border" style={{ borderColor: ACCENT, background: `repeating-linear-gradient(45deg, ${ACCENT}66 0 2px, transparent 2px 4px)` }} /> {d.planned}
              </span>
            </div>
          </div>
          <p className="mb-4 text-xs text-fog">{d.revenueSub}</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.series} barCategoryGap={2} margin={{ top: 4, right: 0, left: -4, bottom: 0 }}>
                <defs>
                  <pattern id="planned" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                    <rect width="4" height="4" fill={`${ACCENT}33`} />
                    <line x1="0" y1="0" x2="0" y2="4" stroke={ACCENT} strokeWidth="2" />
                  </pattern>
                </defs>
                <CartesianGrid vertical={false} stroke="rgba(255,255,255,.05)" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} interval={6} tick={{ fill: "#8b8b98", fontSize: 11 }} tickFormatter={(v: string) => formatDate(v, locale, false)} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: "#8b8b98", fontSize: 11 }} tickFormatter={(v: number) => compactUZS(v, locale)} width={64} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,.04)" }} />
                <Bar dataKey="revenue" radius={[4, 4, 0, 0]} maxBarSize={22}>
                  {data.series.map((x) => (
                    <Cell key={x.date} fill={x.future ? "url(#planned)" : ACCENT} stroke={x.date === data.today ? "#ededf0" : undefined} strokeWidth={x.date === data.today ? 1 : 0} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-display text-sm font-semibold">{d.loadTitle}</h2>
            <Link href="/admin/masters" className="text-xs text-fog hover:text-bone">{d.manage}</Link>
          </div>
          <div className="space-y-5">
            {data.workloadWeek.map((m) => (
              <div key={m.id}>
                <div className="mb-2 flex items-center gap-3">
                  <Avatar name={m.name} color={m.color} size={32} className="!rounded-lg" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{m.name}</div>
                    <div className="truncate text-xs text-fog">
                      {tpl(d.loadLine, { n: m.bookings, booked: Math.round(m.bookedMin / 60), work: Math.round(m.workMin / 60) })} · {compactUZS(m.revenue, locale)}
                    </div>
                  </div>
                  <div className="font-display text-lg font-semibold tabular-nums">{m.load}%</div>
                </div>
                <div className="relative h-2 overflow-hidden rounded-full bg-white/[.06]">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(100, m.load)}%`, background: m.color }} />
                  <div className="absolute top-0 bottom-0 w-px bg-white/30" style={{ left: "80%" }} title={d.target} />
                </div>
              </div>
            ))}
            {!data.workloadWeek.length && <p className="text-sm text-fog">{d.noMasters}</p>}
          </div>
          <p className="mt-5 text-xs text-fog">{d.loadNote}</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="card p-5 sm:p-6">
          <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-sm font-semibold">{d.heatTitle}</h2>
            <span className="text-xs text-fog tabular-nums">
              {hover
                ? (() => {
                    const [wd, h] = hover.split("-").map(Number);
                    return tpl(d.heatCell, { day: weekdayShort(wd, locale), hour: h, n: data.heat[hover] ?? 0 });
                  })()
                : d.heatHover}
            </span>
          </div>
          <p className="mb-4 text-xs text-fog">{d.heatSub}</p>
          <div className="overflow-x-auto">
            <div className="inline-grid min-w-full gap-[2px]" style={{ gridTemplateColumns: `32px repeat(${hours.length}, minmax(28px, 1fr))` }}>
              <span />
              {hours.map((h) => <span key={h} className="pb-1 text-center text-[10px] text-fog tabular-nums">{h}</span>)}
              {[1, 2, 3, 4, 5, 6, 7].map((wd) => (
                <div key={wd} className="contents">
                  <span className="self-center text-[11px] text-fog">{weekdayShort(wd, locale)}</span>
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
            {d.less}
            {[0, 25, 50, 75, 100].map((p) => (
              <span key={p} className="h-3 w-5 rounded-[3px]" style={{ background: p ? `color-mix(in oklab, ${ACCENT} ${18 + p * 0.82}%, #1a1a20)` : "rgba(255,255,255,.03)" }} />
            ))}
            {d.more}
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-5 sm:p-6">
            <h2 className="mb-4 font-display text-sm font-semibold">{d.sourcesTitle}</h2>
            <div className="flex h-3 gap-[2px] overflow-hidden rounded-full">
              {data.sources.filter((s) => s.count).map((s) => (
                <div key={s.source} className="h-full first:rounded-l-full last:rounded-r-full" style={{ width: `${(s.count / srcTotal) * 100}%`, background: SOURCE_COLORS[s.source] }} title={`${sourceLabel(s.source)}: ${s.count}`} />
              ))}
            </div>
            <div className="mt-4 space-y-2">
              {data.sources.map((s) => (
                <div key={s.source} className="flex items-center gap-2 text-sm">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ background: SOURCE_COLORS[s.source] }} />
                  <span className="flex-1 text-fog">{sourceLabel(s.source)}</span>
                  <span className="tabular-nums">{s.count}</span>
                  <span className="w-10 text-right text-xs text-fog tabular-nums">{Math.round((s.count / srcTotal) * 100)}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-sm font-semibold">{d.upcomingTitle}</h2>
              <Link href="/admin/bookings" className="text-xs text-fog hover:text-bone">{d.all}</Link>
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
              {!data.upcoming.length && <p className="text-sm text-fog">{d.noUpcoming}</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
