"use client";

import clsx from "clsx";
import { motion } from "framer-motion";
import { Check, Clock, Moon, Sun, Sunrise, User } from "lucide-react";
import { Avatar, Spinner } from "@/components/ui";
import { tpl } from "@/i18n";
import { useI18n } from "@/i18n/client";
import { formatDate } from "@/i18n/dates";
import { addDays, minToHHMM } from "@/lib/time";
import { Calendar } from "./Calendar";
import type { Master, Slot } from "./types";

export function DateTimeStep(p: {
  serviceMasters: Master[];
  masterFilter: string | null;
  onMasterFilter: (id: string | null) => void;
  today: string | null;
  availability: Record<string, number>;
  availLoading: boolean;
  date: string | null;
  onDate: (date: string) => void;
  slots: Slot[] | null;
  loadFailed: boolean;
  time: number | null;
  onTime: (time: number) => void;
  slotMasters: Master[];
  masterId: string | null;
  onMaster: (id: string) => void;
}) {
  const { t, locale } = useI18n();
  const b = t.booking;
  const { slots } = p;
  const groups = [
    { label: b.morning, icon: Sunrise, from: 0, to: 720 },
    { label: b.afternoon, icon: Sun, from: 720, to: 1020 },
    { label: b.evening, icon: Moon, from: 1020, to: 1440 },
  ];

  return (
    <div className="space-y-5">
      <div>
        <div className="label">{b.master}</div>
        <div className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          <button onClick={() => p.onMasterFilter(null)} className={clsx("flex shrink-0 items-center gap-2.5 rounded-2xl border py-2 pr-4 pl-2 text-sm transition", !p.masterFilter ? "border-forge bg-forge/10" : "border-white/10 hover:border-white/25")}>
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/[.06]"><User className="h-4 w-4" /></span>
            {b.anyMaster}
          </button>
          {p.serviceMasters.map((m) => (
            <button key={m.id} onClick={() => p.onMasterFilter(m.id)} className={clsx("flex shrink-0 items-center gap-2.5 rounded-2xl border py-2 pr-4 pl-2 text-left text-sm transition", p.masterFilter === m.id ? "border-forge bg-forge/10" : "border-white/10 hover:border-white/25")}>
              <Avatar name={m.name} color={m.color} size={36} className="!rounded-xl" />
              <span><span className="block font-semibold leading-tight">{m.name.split(" ")[0]}</span><span className="text-xs text-fog">{m.specialty}</span></span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        {p.today && <Calendar today={p.today} maxDate={addDays(p.today, 60)} availability={p.availability} selected={p.date} onSelect={p.onDate} loading={p.availLoading} />}
        <div className="card p-5 sm:p-6">
          {!p.date ? (
            <div className="grid h-full min-h-48 place-items-center text-center text-fog">
              <div><Clock className="mx-auto mb-3 h-8 w-8 text-white/20" />{b.pickDay}</div>
            </div>
          ) : !slots ? (
            <div className="grid h-full min-h-48 place-items-center"><Spinner className="h-6 w-6 text-forge" /></div>
          ) : (
            <div>
              <div className="mb-4 font-display font-semibold">{formatDate(p.date, locale)}</div>
              {!slots.length && !p.loadFailed && <p className="text-fog">{b.dayFull}</p>}
              <div className="space-y-4">
                {groups.map((g) => {
                  const list = slots.filter((s) => s.time >= g.from && s.time < g.to);
                  if (!list.length) return null;
                  return (
                    <div key={g.label}>
                      <div className="mb-2 flex items-center gap-1.5 text-xs uppercase tracking-wider text-fog"><g.icon className="h-3.5 w-3.5" /> {g.label}</div>
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                        {list.map((s) => (
                          <button
                            key={s.time}
                            onClick={() => p.onTime(s.time)}
                            aria-pressed={p.time === s.time}
                            className={clsx("rounded-xl border py-2.5 text-sm font-semibold tabular-nums transition", p.time === s.time ? "border-transparent bg-gradient-to-br from-forge to-ember text-black shadow-[0_6px_20px_-6px_rgba(255,90,31,.8)]" : "border-white/10 bg-white/[.02] hover:border-forge/60")}
                          >
                            {minToHHMM(s.time)}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {p.time != null && !p.masterFilter && p.slotMasters.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="label">{tpl(b.freeAt, { time: minToHHMM(p.time) })}</div>
          <div className="grid gap-2 sm:grid-cols-2">
            {p.slotMasters.map((m) => (
              <button key={m.id} onClick={() => p.onMaster(m.id)} className={clsx("card flex items-center gap-3 p-3 text-left transition", p.masterId === m.id ? "!border-forge ring-4 ring-forge/10" : "hover:border-white/20")}>
                <Avatar name={m.name} color={m.color} size={44} />
                <div className="flex-1"><div className="font-semibold">{m.name}</div><div className="text-xs text-fog">{m.specialty}</div></div>
                {p.masterId === m.id && <Check className="h-5 w-5 text-forge" />}
              </button>
            ))}
          </div>
          {p.slotMasters.length > 1 && !p.masterId && <p className="mt-2 text-xs text-fog">{b.autoAssign}</p>}
        </motion.div>
      )}
    </div>
  );
}
