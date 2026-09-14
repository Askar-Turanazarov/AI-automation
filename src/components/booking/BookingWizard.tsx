"use client";

import clsx from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Clock, Moon, Sun, Sunrise, User } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Price } from "@/components/Price";
import { Avatar, Spinner } from "@/components/ui";
import { tpl } from "@/i18n";
import { useI18n } from "@/i18n/client";
import { formatDate } from "@/i18n/dates";
import { addDays, minToHHMM } from "@/lib/time";
import { Calendar } from "./Calendar";

type Service = { id: string; name: string; category: string; description: string; durationMin: number; price: number; masterIds: string[] };
type Master = { id: string; name: string; specialty: string; color: string; serviceIds: string[] };
type Slot = { time: number; masterIds: string[] };
type Done = { service: string; master: string; date: string; time: string; price: number };

type TgWebApp = {
  initData: string;
  initDataUnsafe?: { user?: { first_name?: string; last_name?: string } };
  ready: () => void;
  expand: () => void;
  close: () => void;
};
const tg = () => (typeof window !== "undefined" ? (window as unknown as { Telegram?: { WebApp?: TgWebApp } }).Telegram?.WebApp : undefined);
// fetch падает TypeError при отсутствии сети; остальное (HTTP-ошибка, битый JSON) — общая ошибка
const errKey = (e: unknown): "error" | "networkError" => (e instanceof TypeError ? "networkError" : "error");

export function BookingWizard({ initialService, initialMaster }: { initialService?: string; initialMaster?: string }) {
  const { t, locale } = useI18n();
  const b = t.booking;
  const [catalog, setCatalog] = useState<{ services: Service[]; masters: Master[] } | null>(null);
  const [step, setStep] = useState(0);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [masterFilter, setMasterFilter] = useState<string | null>(initialMaster ?? null);
  const [category, setCategory] = useState<string | null>(null);

  const [today, setToday] = useState<string | null>(null);
  const [availability, setAvailability] = useState<Record<string, number>>({});
  const [availLoading, setAvailLoading] = useState(false);
  const [date, setDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [slotsVersion, setSlotsVersion] = useState(0);
  const [time, setTime] = useState<number | null>(null);
  const [masterId, setMasterId] = useState<string | null>(null);

  const [form, setForm] = useState({ clientName: "", phone: "", car: "", comment: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<"error" | "networkError" | null>(null);
  const [done, setDone] = useState<Done | null>(null);
  const [inTelegram, setInTelegram] = useState(false);

  const hours = (m: number) => (m >= 60 ? `${+(m / 60).toFixed(1)} ${t.common.h}` : `${m} ${t.common.min}`);

  useEffect(() => {
    const app = tg();
    if (app?.initData) {
      app.ready();
      app.expand();
      setInTelegram(true);
      const u = app.initDataUnsafe?.user;
      if (u?.first_name) setForm((f) => ({ ...f, clientName: [u.first_name, u.last_name].filter(Boolean).join(" ") }));
    }
    fetch(`/api/catalog?locale=${locale}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((c) => {
        setLoadError(null);
        setCatalog(c);
        if (initialService && c.services.some((s: Service) => s.id === initialService)) {
          setServiceId(initialService);
          setStep(1);
        }
      })
      .catch((e) => setLoadError(errKey(e)));
  }, [initialService, locale]);

  const service = catalog?.services.find((s) => s.id === serviceId);
  const mastersById = useMemo(() => Object.fromEntries((catalog?.masters ?? []).map((m) => [m.id, m])), [catalog]);
  const serviceMasters = service ? service.masterIds.map((id) => mastersById[id]).filter(Boolean) : [];
  const categories = [...new Set((catalog?.services ?? []).map((s) => s.category))];
  const visibleServices = (catalog?.services ?? []).filter(
    (s) => (!category || s.category === category) && (!initialMaster || !masterFilter || s.masterIds.includes(masterFilter)),
  );

  // доступные дни
  useEffect(() => {
    if (!serviceId) return;
    const ac = new AbortController();
    setAvailLoading(true);
    setLoadError(null);
    const q = new URLSearchParams({ serviceId, days: "61", ...(masterFilter ? { masterId: masterFilter } : {}) });
    fetch(`/api/availability?${q}`, { signal: ac.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => {
        setToday(d.today);
        const days: { date: string; slots: number }[] = d.days ?? [];
        setAvailability(Object.fromEntries(days.map((x) => [x.date, x.slots])));
        setDate((cur) => (cur && days.some((x) => x.date === cur && x.slots > 0) ? cur : null));
      })
      .catch((e) => {
        if (ac.signal.aborted) return; // устаревший запрос — ответ игнорируем
        setAvailability({});
        setLoadError(errKey(e));
      })
      .finally(() => {
        if (!ac.signal.aborted) setAvailLoading(false);
      });
    return () => ac.abort();
  }, [serviceId, masterFilter, slotsVersion]);

  // слоты на выбранный день
  useEffect(() => {
    setSlots(null);
    setTime(null);
    setMasterId(null);
    if (!serviceId || !date) return;
    const ac = new AbortController();
    setLoadError(null);
    const q = new URLSearchParams({ serviceId, date, ...(masterFilter ? { masterId: masterFilter } : {}) });
    fetch(`/api/slots?${q}`, { signal: ac.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => setSlots(d.slots ?? []))
      .catch((e) => {
        if (ac.signal.aborted) return;
        setSlots([]);
        setLoadError(errKey(e));
      });
    return () => ac.abort();
  }, [serviceId, date, masterFilter, slotsVersion]);

  const slotMasters = time != null ? (slots?.find((s) => s.time === time)?.masterIds ?? []).map((id) => mastersById[id]).filter(Boolean) : [];

  useEffect(() => {
    if (masterFilter) setMasterId(masterFilter);
    else if (slotMasters.length === 1) setMasterId(slotMasters[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [time, masterFilter]);

  async function submit() {
    if (!service || !date || time == null) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId: service.id, masterId, date, startMin: time, ...form, initData: tg()?.initData, locale }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? b.failed);
        if (data.code === "slot_taken" || data.code === "slot_just_taken") {
          setStep(1);
          setSlotsVersion((v) => v + 1); // перезапросить свободное время
        }
        return;
      }
      setDone(data);
    } catch {
      setError(t.common.networkError);
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="card mx-auto max-w-xl p-8 text-center sm:p-12">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", delay: 0.1 }}
          className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-forge to-ember text-black shadow-[0_0_60px_-5px_rgba(255,90,31,.7)]"
        >
          <Check className="h-10 w-10" strokeWidth={3} />
        </motion.div>
        <h2 className="mt-7 font-display text-3xl font-bold uppercase">{b.doneTitle}</h2>
        <p className="mt-3 text-fog">{inTelegram ? b.doneTg : b.doneWeb}</p>
        <div className="mt-8 space-y-3 rounded-2xl border border-white/[.07] bg-white/[.02] p-5 text-left text-sm">
          {[[b.service, done.service], [b.master, done.master], [b.when, `${done.date}, ${done.time}`]].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4"><span className="text-fog">{k}</span><span className="text-right font-semibold">{v}</span></div>
          ))}
          <div className="flex justify-between gap-4">
            <span className="text-fog">{b.cost}</span>
            <Price amount={done.price} locale={locale} align="right" mainClassName="font-semibold" />
          </div>
        </div>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {inTelegram ? (
            <button onClick={() => tg()?.close()} className="btn-forge">{b.ok}</button>
          ) : (
            <Link href={`/${locale}`} className="btn-forge">{b.home}</Link>
          )}
          <button onClick={() => { setDone(null); setStep(0); setDate(null); setServiceId(null); }} className="btn-ghost">{b.again}</button>
        </div>
      </motion.div>
    );
  }

  const canNext =
    step === 0 ? !!serviceId : step === 1 ? !!date && time != null && (!!masterId || slotMasters.length > 0) : form.clientName.trim().length >= 2 && form.phone.trim().length >= 6;

  const groups = [
    { label: b.morning, icon: Sunrise, from: 0, to: 720 },
    { label: b.afternoon, icon: Sun, from: 720, to: 1020 },
    { label: b.evening, icon: Moon, from: 1020, to: 1440 },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="min-w-0">
        <div className="mb-6 flex items-center gap-2">
          {b.steps.map((s, i) => (
            <button
              key={s}
              disabled={i > step}
              onClick={() => setStep(i)}
              className={clsx("flex items-center gap-2 rounded-full py-1.5 pr-4 pl-1.5 text-sm transition", i === step ? "bg-white/[.07] text-bone" : i < step ? "text-bone hover:bg-white/5" : "text-fog/50")}
            >
              <span className={clsx("grid h-7 w-7 place-items-center rounded-full text-xs font-bold", i < step ? "bg-forge text-black" : i === step ? "bg-bone text-black" : "border border-white/15")}>
                {i < step ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : i + 1}
              </span>
              <span className="hidden sm:inline">{s}</span>
            </button>
          ))}
        </div>

        {!catalog ? (
          loadError ? (
            <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{t.common[loadError]}</div>
          ) : (
            <div className="card grid h-80 place-items-center"><Spinner className="h-6 w-6 text-forge" /></div>
          )
        ) : (
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
              {step === 0 && (
                <div>
                  <div className="scrollbar-none -mx-1 mb-5 flex gap-2 overflow-x-auto px-1">
                    {[null, ...categories].map((c) => (
                      <button key={c ?? "all"} onClick={() => setCategory(c)} className={clsx("shrink-0 rounded-full border px-4 py-2 text-sm transition", category === c ? "border-forge bg-forge/15 text-bone" : "border-white/10 text-fog hover:text-bone")}>
                        {c ?? t.common.all}
                      </button>
                    ))}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {visibleServices.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => {
                          setServiceId(s.id);
                          setDate(null);
                          if (masterFilter && !s.masterIds.includes(masterFilter)) setMasterFilter(null);
                          setStep(1);
                        }}
                        className={clsx("card group p-5 text-left transition hover:-translate-y-0.5 hover:border-forge/50", serviceId === s.id && "!border-forge ring-4 ring-forge/10")}
                      >
                        <div className="text-xs uppercase tracking-wider text-fog">{s.category}</div>
                        <div className="mt-1.5 font-display font-semibold">{s.name}</div>
                        <p className="mt-2 line-clamp-2 text-sm text-fog">{s.description}</p>
                        <div className="mt-4 flex items-end justify-between text-sm">
                          <span className="flex items-center gap-1.5 pb-0.5 text-fog"><Clock className="h-3.5 w-3.5" /> {hours(s.durationMin)}</span>
                          <Price amount={s.price} locale={locale} align="right" mainClassName="font-display font-semibold text-ember" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {step === 1 && service && (
                <div className="space-y-5">
                  <div>
                    <div className="label">{b.master}</div>
                    <div className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                      <button onClick={() => setMasterFilter(null)} className={clsx("flex shrink-0 items-center gap-2.5 rounded-2xl border py-2 pr-4 pl-2 text-sm transition", !masterFilter ? "border-forge bg-forge/10" : "border-white/10 hover:border-white/25")}>
                        <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/[.06]"><User className="h-4 w-4" /></span>
                        {b.anyMaster}
                      </button>
                      {serviceMasters.map((m) => (
                        <button key={m.id} onClick={() => setMasterFilter(m.id)} className={clsx("flex shrink-0 items-center gap-2.5 rounded-2xl border py-2 pr-4 pl-2 text-left text-sm transition", masterFilter === m.id ? "border-forge bg-forge/10" : "border-white/10 hover:border-white/25")}>
                          <Avatar name={m.name} color={m.color} size={36} className="!rounded-xl" />
                          <span><span className="block font-semibold leading-tight">{m.name.split(" ")[0]}</span><span className="text-xs text-fog">{m.specialty}</span></span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-5 xl:grid-cols-2">
                    {today && <Calendar today={today} maxDate={addDays(today, 60)} availability={availability} selected={date} onSelect={setDate} loading={availLoading} />}
                    <div className="card p-5 sm:p-6">
                      {!date ? (
                        <div className="grid h-full min-h-48 place-items-center text-center text-fog">
                          <div><Clock className="mx-auto mb-3 h-8 w-8 text-white/20" />{b.pickDay}</div>
                        </div>
                      ) : !slots ? (
                        <div className="grid h-full min-h-48 place-items-center"><Spinner className="h-6 w-6 text-forge" /></div>
                      ) : (
                        <div>
                          <div className="mb-4 font-display font-semibold">{formatDate(date, locale)}</div>
                          {!slots.length && !loadError && <p className="text-fog">{b.dayFull}</p>}
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
                                        onClick={() => { setTime(s.time); if (!masterFilter) setMasterId(null); }}
                                        className={clsx("rounded-xl border py-2.5 text-sm font-semibold tabular-nums transition", time === s.time ? "border-transparent bg-gradient-to-br from-forge to-ember text-black shadow-[0_6px_20px_-6px_rgba(255,90,31,.8)]" : "border-white/10 bg-white/[.02] hover:border-forge/60")}
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

                  {time != null && !masterFilter && slotMasters.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                      <div className="label">{tpl(b.freeAt, { time: minToHHMM(time) })}</div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {slotMasters.map((m) => (
                          <button key={m.id} onClick={() => setMasterId(m.id)} className={clsx("card flex items-center gap-3 p-3 text-left transition", masterId === m.id ? "!border-forge ring-4 ring-forge/10" : "hover:border-white/20")}>
                            <Avatar name={m.name} color={m.color} size={44} />
                            <div className="flex-1"><div className="font-semibold">{m.name}</div><div className="text-xs text-fog">{m.specialty}</div></div>
                            {masterId === m.id && <Check className="h-5 w-5 text-forge" />}
                          </button>
                        ))}
                      </div>
                      {slotMasters.length > 1 && !masterId && <p className="mt-2 text-xs text-fog">{b.autoAssign}</p>}
                    </motion.div>
                  )}
                </div>
              )}

              {step === 2 && (
                <div className="card grid gap-4 p-6 sm:grid-cols-2">
                  <div>
                    <label className="label">{b.name} *</label>
                    <input className="input" value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} placeholder={b.namePh} autoComplete="name" />
                  </div>
                  <div>
                    <label className="label">{b.phone} *</label>
                    <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder={b.phonePh} inputMode="tel" autoComplete="tel" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label">{b.car}</label>
                    <input className="input" value={form.car} onChange={(e) => setForm({ ...form, car: e.target.value })} placeholder={b.carPh} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label">{b.comment}</label>
                    <textarea className="input min-h-24" value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} placeholder={b.commentPh} />
                  </div>
                </div>
              )}
              {(error || loadError) && <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error || (loadError && t.common[loadError])}</div>}
            </motion.div>
          </AnimatePresence>
        )}

        <div className="mt-6 flex items-center justify-between gap-3">
          {step > 0 ? (
            <button onClick={() => setStep(step - 1)} className="btn-ghost"><ArrowLeft className="h-4 w-4" /> {t.common.back}</button>
          ) : (
            <span />
          )}
          {step > 0 &&
            (step < 2 ? (
              <button disabled={!canNext} onClick={() => { setError(null); setStep(step + 1); }} className="btn-forge">{t.common.next} <ArrowRight className="h-4 w-4" /></button>
            ) : (
              <button disabled={!canNext || submitting} onClick={submit} className="btn-forge">{submitting ? <Spinner /> : <Check className="h-4 w-4" />} {b.confirm}</button>
            ))}
        </div>
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="card relative overflow-hidden p-6">
          <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-forge/20 blur-3xl" />
          <div className="relative">
            <div className="eyebrow">{b.summary}</div>
            <div className="mt-5 space-y-4 text-sm">
              <Row k={b.service} v={service?.name} />
              <Row k={b.duration} v={service && hours(service.durationMin)} />
              <Row k={b.date} v={date && formatDate(date, locale)} />
              <Row k={b.time} v={time != null && service ? `${minToHHMM(time)}–${minToHHMM(time + service.durationMin)}` : null} />
              <Row k={b.master} v={masterId ? mastersById[masterId]?.name : time != null ? b.anyFree : null} />
            </div>
            <div className="mt-6 flex items-end justify-between border-t border-white/[.07] pt-5">
              <span className="pb-1 text-fog">{b.total}</span>
              {service ? <Price amount={service.price} locale={locale} align="right" mainClassName="font-display text-2xl font-bold" /> : <span className="font-display text-2xl font-bold">—</span>}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

function Row({ k, v }: { k: string; v?: string | null | false }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-fog">{k}</span>
      <span className={clsx("text-right font-semibold", !v && "text-white/20")}>{v || "—"}</span>
    </div>
  );
}
