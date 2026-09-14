"use client";

import clsx from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Spinner } from "@/components/ui";
import { useI18n } from "@/i18n/client";
import { BookingDone } from "./BookingDone";
import { BookingSummary } from "./BookingSummary";
import { ContactStep } from "./ContactStep";
import { DateTimeStep } from "./DateTimeStep";
import { ServiceStep } from "./ServiceStep";
import type { Done, Master, Service, Slot } from "./types";

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
      <BookingDone
        done={done}
        inTelegram={inTelegram}
        onClose={() => tg()?.close()}
        onAgain={() => { setDone(null); setStep(0); setDate(null); setServiceId(null); }}
      />
    );
  }

  const canNext =
    step === 0 ? !!serviceId : step === 1 ? !!date && time != null && (!!masterId || slotMasters.length > 0) : form.clientName.trim().length >= 2 && form.phone.trim().length >= 6;

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
                <ServiceStep
                  categories={categories}
                  category={category}
                  onCategory={setCategory}
                  services={visibleServices}
                  serviceId={serviceId}
                  onPick={(s) => {
                    setServiceId(s.id);
                    setDate(null);
                    if (masterFilter && !s.masterIds.includes(masterFilter)) setMasterFilter(null);
                    setStep(1);
                  }}
                />
              )}

              {step === 1 && service && (
                <DateTimeStep
                  serviceMasters={serviceMasters}
                  masterFilter={masterFilter}
                  onMasterFilter={setMasterFilter}
                  today={today}
                  availability={availability}
                  availLoading={availLoading}
                  date={date}
                  onDate={setDate}
                  slots={slots}
                  loadFailed={!!loadError}
                  time={time}
                  onTime={(v) => { setTime(v); if (!masterFilter) setMasterId(null); }}
                  slotMasters={slotMasters}
                  masterId={masterId}
                  onMaster={setMasterId}
                />
              )}

              {step === 2 && <ContactStep form={form} setForm={setForm} />}
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

      <BookingSummary service={service} date={date} time={time} master={masterId ? mastersById[masterId]?.name : time != null ? b.anyFree : null} />
    </div>
  );
}
