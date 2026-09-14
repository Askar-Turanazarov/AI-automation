"use client";

import clsx from "clsx";
import { motion } from "framer-motion";
import { Plus, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { Avatar, chipClass, Spinner } from "@/components/ui";
import { useI18n } from "@/i18n/client";
import type { Locale } from "@/i18n/config";
import { formatDate, weekdayFull } from "@/i18n/dates";
import { sendJson } from "@/lib/http";
import type { getWorkload } from "@/lib/stats";
import { hhmmToMin, minToHHMM } from "@/lib/time";
import { TranslateBar } from "./TranslateBar";
import { mergeTranslations, suffix } from "./translations";

type Schedule = { weekday: number; startMin: number; endMin: number };
type Texts = { name: string; nameLatin: string; specialty: string; specialtyUz: string; specialtyEn: string; bio: string; bioUz: string; bioEn: string };
export type Master = Texts & {
  id: string;
  color: string;
  active: boolean;
  serviceIds: string[];
  schedules: Schedule[];
  timeOffs: { date: string; reason: string }[];
  load: Awaited<ReturnType<typeof getWorkload>>[number] | null;
};
type Draft = Omit<Master, "id" | "load" | "timeOffs">;
export type Service = { id: string; name: string; category: string };

const COLORS = ["#FF5A1F", "#FFB020", "#22D3EE", "#A78BFA", "#34D399", "#F472B6", "#60A5FA", "#E5E7EB"];
const EMPTY: Draft = {
  name: "",
  nameLatin: "",
  specialty: "",
  specialtyUz: "",
  specialtyEn: "",
  bio: "",
  bioUz: "",
  bioEn: "",
  color: COLORS[0],
  active: true,
  serviceIds: [],
  schedules: [1, 2, 3, 4, 5].map((weekday) => ({ weekday, startMin: 600, endMin: 1140 })),
};

/** Выезжающая панель создания / редактирования мастера */
export function MasterEditor({ master, services, today, onClose }: { master: Master | null; services: Service[]; today: string; onClose: () => void }) {
  const { t, locale } = useI18n();
  const tm = t.admin.masters;
  const router = useRouter();
  const uid = useId();
  const [d, setD] = useState<Draft>(() => {
    if (!master) return { ...EMPTY };
    const { id: _id, load: _load, timeOffs: _to, ...rest } = master;
    return rest;
  });
  const [lang, setLang] = useState<Locale>("ru");
  const [timeOffs, setTimeOffs] = useState(master?.timeOffs ?? []);
  const [offDate, setOffDate] = useState("");
  const [offReason, setOffReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const textKey = (base: "specialty" | "bio") => `${base}${suffix(lang)}` as keyof Texts;

  const setDay = (wd: number, patch: Partial<Schedule> | null) =>
    setD((x) => {
      const rest = x.schedules.filter((s) => s.weekday !== wd);
      if (patch === null) return { ...x, schedules: rest };
      const cur = x.schedules.find((s) => s.weekday === wd) ?? { weekday: wd, startMin: 600, endMin: 1140 };
      return { ...x, schedules: [...rest, { ...cur, ...patch }].sort((a, b) => a.weekday - b.weekday) };
    });

  // Сохранение и удаление: при ошибке панель остаётся открытой
  async function send(url: string, method: "POST" | "PATCH" | "DELETE", body?: unknown) {
    setSaving(true);
    setError("");
    const res = await sendJson(url, method, body, t.common);
    setSaving(false);
    if (!res.ok) return setError(res.error);
    router.refresh();
    onClose();
  }

  const save = () => send(master ? `/api/admin/masters/${master.id}` : "/api/admin/masters", master ? "PATCH" : "POST", d);

  function remove() {
    if (master && confirm(tm.deleteConfirm)) send(`/api/admin/masters/${master.id}`, "DELETE");
  }

  async function timeOff(date: string, removeIt = false) {
    if (!master || !date) return;
    setError("");
    const res = await sendJson(`/api/admin/masters/${master.id}`, "POST", { date, reason: offReason, remove: removeIt }, t.common);
    if (!res.ok) return setError(res.error);
    setTimeOffs((list) => (removeIt ? list.filter((x) => x.date !== date) : [...list.filter((x) => x.date !== date), { date, reason: offReason }].sort((a, b) => a.date.localeCompare(b.date))));
    setOffDate("");
    setOffReason("");
    router.refresh();
  }

  const cats = [...new Set(services.map((s) => s.category))];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${uid}-title`}
        className="relative flex h-full w-full max-w-xl flex-col border-l border-white/10 bg-coal"
      >
        <div className="flex items-center justify-between border-b border-white/[.06] px-6 py-5">
          <h2 id={`${uid}-title`} className="font-display text-lg font-semibold">{master ? tm.editTitle : tm.newTitle}</h2>
          <button onClick={onClose} aria-label={t.common.close} className="rounded-full p-2 text-fog hover:bg-white/5"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex-1 space-y-7 overflow-y-auto px-6 py-6">
          <div className="flex items-center gap-4">
            <Avatar name={(locale === "ru" ? d.name : d.nameLatin || d.name) || "?"} color={d.color} size={64} />
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button key={c} onClick={() => setD({ ...d, color: c })} className={clsx("h-7 w-7 rounded-full transition", d.color === c && "ring-2 ring-white ring-offset-2 ring-offset-coal")} style={{ background: c }} aria-label={c} />
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div><label htmlFor={`${uid}-name`} className="label">{tm.name}</label><input id={`${uid}-name`} className="input" value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} /></div>
            <div><label htmlFor={`${uid}-latin`} className="label">{tm.nameLatin}</label><input id={`${uid}-latin`} className="input" value={d.nameLatin} onChange={(e) => setD({ ...d, nameLatin: e.target.value })} /></div>
            <div className="sm:col-span-2">
              <TranslateBar
                lang={lang}
                onLang={setLang}
                filled={{ uz: !!(d.specialtyUz && (d.bioUz || !d.bio)), en: !!(d.specialtyEn && (d.bioEn || !d.bio)) }}
                fields={{ specialty: d.specialty, bio: d.bio }}
                names={d.nameLatin ? {} : { name: d.name }}
                onResult={(r) => setD((x) => ({ ...mergeTranslations(x, r, ["specialty", "bio"]), nameLatin: x.nameLatin || r.latin.name || "" }))}
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor={`${uid}-specialty`} className="label">{tm.specialty} · {lang.toUpperCase()}</label>
              <input id={`${uid}-specialty`} className="input" lang={lang} value={d[textKey("specialty")]} placeholder={lang !== "ru" ? d.specialty : ""} onChange={(e) => setD({ ...d, [textKey("specialty")]: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor={`${uid}-bio`} className="label">{tm.bio} · {lang.toUpperCase()}</label>
              <textarea id={`${uid}-bio`} className="input min-h-20" lang={lang} value={d[textKey("bio")]} placeholder={lang !== "ru" ? d.bio : ""} onChange={(e) => setD({ ...d, [textKey("bio")]: e.target.value })} />
            </div>
            <label className="flex items-center gap-3 text-sm sm:col-span-2">
              <input type="checkbox" checked={d.active} onChange={(e) => setD({ ...d, active: e.target.checked })} className="h-4 w-4 accent-[#ff5a1f]" />
              {tm.active}
            </label>
          </div>

          <div>
            <div className="label">{tm.schedule}</div>
            <div className="space-y-2">
              {[1, 2, 3, 4, 5, 6, 7].map((wd) => {
                const s = d.schedules.find((x) => x.weekday === wd);
                return (
                  <div key={wd} className={clsx("flex items-center gap-3 rounded-2xl border px-3 py-2 transition", s ? "border-white/10 bg-white/[.03]" : "border-transparent")}>
                    <button
                      onClick={() => setDay(wd, s ? null : {})}
                      className={clsx("relative h-6 w-11 shrink-0 rounded-full transition", s ? "bg-forge" : "bg-white/10")}
                      aria-label={weekdayFull(wd, locale)}
                      aria-pressed={!!s}
                    >
                      <span className={clsx("absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all", s ? "left-5.5" : "left-0.5")} />
                    </button>
                    <span className="w-28 text-sm">{weekdayFull(wd, locale)}</span>
                    {s ? (
                      <div className="ml-auto flex items-center gap-2 text-sm">
                        <input type="time" step={1800} value={minToHHMM(s.startMin)} onChange={(e) => setDay(wd, { startMin: hhmmToMin(e.target.value) })} className="input !w-auto !px-3 !py-1.5" />
                        <span className="text-fog">—</span>
                        <input type="time" step={1800} value={minToHHMM(s.endMin)} onChange={(e) => setDay(wd, { endMin: hhmmToMin(e.target.value) })} className="input !w-auto !px-3 !py-1.5" />
                      </div>
                    ) : (
                      <span className="ml-auto text-sm text-fog">{tm.dayOff}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {master && (
            <div>
              <div className="label">{tm.timeOff}</div>
              <div className="flex flex-wrap gap-2">
                <input type="date" min={today} value={offDate} onChange={(e) => setOffDate(e.target.value)} className="input !w-auto !py-2" />
                <input placeholder={tm.reason} value={offReason} onChange={(e) => setOffReason(e.target.value)} className="input !w-40 !py-2" />
                <button onClick={() => timeOff(offDate)} disabled={!offDate} className="btn-ghost !py-2 text-sm"><Plus className="h-4 w-4" /> {t.common.add}</button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {timeOffs.map((to) => (
                  <span key={to.date} className="flex items-center gap-2 rounded-full bg-red-400/10 py-1 pr-1.5 pl-3 text-sm text-red-200">
                    {formatDate(to.date, locale)}{to.reason && ` · ${to.reason}`}
                    <button onClick={() => timeOff(to.date, true)} aria-label={t.common.delete} className="rounded-full p-1 hover:bg-white/10"><X className="h-3 w-3" /></button>
                  </span>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="label">{tm.services}</div>
            <div className="space-y-4">
              {cats.map((c) => (
                <div key={c}>
                  <div className="mb-2 text-xs text-fog">{c}</div>
                  <div className="flex flex-wrap gap-2">
                    {services.filter((s) => s.category === c).map((s) => {
                      const on = d.serviceIds.includes(s.id);
                      return (
                        <button key={s.id} onClick={() => setD({ ...d, serviceIds: on ? d.serviceIds.filter((x) => x !== s.id) : [...d.serviceIds, s.id] })} className={chipClass(on, "px-3 py-1.5")}>
                          {s.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 border-t border-white/[.06] px-6 py-4">
          {master && <button onClick={remove} className="rounded-full p-3 text-red-300 hover:bg-red-400/10" aria-label={t.common.delete}><Trash2 className="h-4 w-4" /></button>}
          {error && <span className="text-sm text-red-400">{error}</span>}
          <div className="flex-1" />
          <button onClick={onClose} className="btn-ghost">{t.common.cancel}</button>
          <button onClick={save} disabled={saving || d.name.trim().length < 2 || d.specialty.trim().length < 2} className="btn-forge">{saving && <Spinner />} {t.common.save}</button>
        </div>
      </motion.div>
    </div>
  );
}
