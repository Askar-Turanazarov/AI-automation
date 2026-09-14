"use client";

import clsx from "clsx";
import { AnimatePresence } from "framer-motion";
import { CalendarOff, Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { Avatar, ProgressBar } from "@/components/ui";
import { tpl } from "@/i18n";
import { useI18n } from "@/i18n/client";
import { formatDate, weekdayShort } from "@/i18n/dates";
import { localizeMaster } from "@/lib/i18n-data";
import { formatTimeRange, minToHHMM } from "@/lib/time";
import { MasterEditor, type Master, type Service } from "./MasterEditor";

export function MastersManager({ masters, services, today }: { masters: Master[]; services: Service[]; today: string }) {
  const { t, locale } = useI18n();
  const tm = t.admin.masters;
  const [editing, setEditing] = useState<Master | "new" | null>(null);

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {masters.map((raw) => {
          const m = localizeMaster(raw, locale);
          return (
            <div key={m.id} className={clsx("card relative overflow-hidden p-6", !m.active && "opacity-50")}>
              <div className="absolute inset-x-0 top-0 h-1" style={{ background: m.color }} />
              <div className="flex items-start gap-4">
                <Avatar name={m.name} color={m.color} size={56} />
                <div className="min-w-0 flex-1">
                  <div className="font-display font-semibold">{m.name}</div>
                  <div className="text-sm text-fog">{m.specialty}</div>
                  {!m.active && <span className="mt-1 inline-block rounded-full bg-white/10 px-2 py-0.5 text-xs">{tm.hidden}</span>}
                </div>
                <button
                  onClick={() => setEditing(raw)}
                  className="rounded-full border border-white/10 p-2 text-fog hover:border-forge/60 hover:text-bone"
                  aria-label={t.common.edit}
                >
                  <Pencil className="h-4 w-4" />
                </button>
              </div>

              {m.load && (
                <div className="mt-6">
                  <div className="mb-2 flex items-baseline justify-between text-sm">
                    <span className="text-fog">{tm.load7}</span>
                    <span className="font-display font-semibold tabular-nums">{m.load.load}%</span>
                  </div>
                  <ProgressBar value={m.load.load} color={m.color} className="h-2" />
                  <div className="mt-2 text-xs text-fog">
                    {tpl(tm.loadLine, {
                      n: m.load.bookings,
                      booked: Math.round(m.load.bookedMin / 60),
                      work: Math.round(m.load.workMin / 60),
                    })}
                  </div>
                </div>
              )}

              <div className="mt-5 grid grid-cols-7 gap-1">
                {[1, 2, 3, 4, 5, 6, 7].map((wd) => {
                  const s = m.schedules.find((x) => x.weekday === wd);
                  return (
                    <div
                      key={wd}
                      className={clsx("rounded-lg py-1.5 text-center text-[11px]", s ? "bg-white/[.06]" : "text-white/25")}
                      title={s ? formatTimeRange(s.startMin, s.endMin) : tm.dayOff}
                    >
                      <div className="font-semibold">{weekdayShort(wd, locale)}</div>
                      <div className="text-fog">{s ? `${minToHHMM(s.startMin).slice(0, 2)}–${minToHHMM(s.endMin).slice(0, 2)}` : "—"}</div>
                    </div>
                  );
                })}
              </div>
              {m.timeOffs.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {m.timeOffs.slice(0, 4).map((to) => (
                    <span key={to.date} className="flex items-center gap-1 rounded-full bg-red-400/10 px-2.5 py-1 text-xs text-red-300">
                      <CalendarOff className="h-3 w-3" /> {formatDate(to.date, locale, false)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        <button
          onClick={() => setEditing("new")}
          className="grid min-h-60 place-items-center rounded-3xl border border-dashed border-white/15 text-fog transition hover:border-forge/60 hover:text-bone"
        >
          <span className="flex flex-col items-center gap-2">
            <Plus className="h-7 w-7" /> {tm.add}
          </span>
        </button>
      </div>

      <AnimatePresence>
        {editing && (
          <MasterEditor
            key="editor"
            master={editing === "new" ? null : editing}
            services={services}
            today={today}
            onClose={() => setEditing(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
