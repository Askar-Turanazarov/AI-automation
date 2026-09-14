"use client";

import clsx from "clsx";
import { motion } from "framer-motion";
import { CalendarClock, CalendarPlus, Check, ListChecks, RotateCw, Send, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { BookingWizard } from "@/components/booking/BookingWizard";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Price } from "@/components/Price";
import { Avatar, IconButton, Spinner } from "@/components/ui";
import { useI18n } from "@/i18n/client";
import type { BookingStatus } from "@/lib/booking/status";
import type { BookingView } from "@/lib/booking/view";
import { BUSINESS } from "@/lib/business";
import { alertTg, confirmTg, haptic, setupTelegramApp, tg } from "@/lib/telegram/miniapp";

type MyData = { upcoming: BookingView[]; history: BookingView[] };
type Tab = "book" | "my";

const STATUS_STYLE: Record<BookingStatus, string> = {
  confirmed: "bg-emerald-400/10 text-emerald-400",
  pending: "bg-ember/10 text-ember",
  done: "bg-white/[.06] text-fog",
  cancelled: "bg-red-500/10 text-red-300",
};

export function MiniApp({ initialTab, rescheduleId }: { initialTab: Tab; rescheduleId?: string }) {
  const { t, locale } = useI18n();
  const [tab, setTab] = useState<Tab>(initialTab);
  // null — ещё не известно: объект Telegram появляется только в браузере
  const [inTelegram, setInTelegram] = useState<boolean | null>(null);
  const [data, setData] = useState<MyData | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [rescheduling, setRescheduling] = useState<BookingView | null>(null);
  const [pendingReschedule, setPendingReschedule] = useState(rescheduleId);

  useEffect(() => setInTelegram(setupTelegramApp()), []);

  const load = useCallback(async () => {
    const initData = tg()?.initData;
    if (!initData) return;
    setLoadFailed(false);
    try {
      const res = await fetch(`/api/tg/bookings?locale=${locale}`, { headers: { "X-Telegram-Init-Data": initData } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch {
      setLoadFailed(true);
    }
  }, [locale]);

  // обновляем при каждом переключении вкладки — после новой записи список уже актуален
  useEffect(() => {
    if (inTelegram) load();
  }, [inTelegram, tab, load]);

  // кнопка «Перенести» из напоминания бота: сразу открываем перенос этой записи
  useEffect(() => {
    if (!data || !pendingReschedule) return;
    setRescheduling(data.upcoming.find((b) => b.id === pendingReschedule) ?? null);
    setPendingReschedule(undefined);
  }, [data, pendingReschedule]);

  function switchTab(next: Tab) {
    if (next === tab) return;
    haptic("selection");
    setTab(next);
    window.scrollTo({ top: 0 });
  }

  async function cancel(b: BookingView) {
    if (!(await confirmTg(t.app.cancelConfirm))) return;
    setCancelling(b.id);
    try {
      const res = await fetch(`/api/tg/bookings/${b.id}`, { method: "DELETE", headers: { "X-Telegram-Init-Data": tg()?.initData ?? "" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      haptic("success");
      await load();
    } catch {
      haptic("error");
      alertTg(t.app.cancelFailed);
    } finally {
      setCancelling(null);
    }
  }

  if (inTelegram === null) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <Spinner className="h-6 w-6 text-forge" />
      </div>
    );
  }
  if (!inTelegram) return <OutsideTelegram />;

  const count = data?.upcoming.length ?? 0;
  const tabs = [
    { id: "book", Icon: CalendarPlus, label: t.app.tabBook },
    { id: "my", Icon: ListChecks, label: t.app.tabMy },
  ] as const;

  return (
    <div className="relative min-h-dvh">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(ellipse_at_top,rgba(255,90,31,.16),transparent_65%)]" />
      <header className="relative flex items-center justify-between gap-3 px-4 pt-4">
        <div className="font-display text-sm font-bold tracking-[.14em] uppercase">
          Octane <span className="text-forge">Forge</span>
        </div>
        <LanguageSwitcher />
      </header>

      {/* вкладки не размонтируются: незаконченная запись не теряется при просмотре своих записей */}
      <main className="relative px-4 pt-5 pb-28">
        <div hidden={tab !== "book"}>
          <BookingWizard onMyBookings={() => switchTab("my")} />
        </div>
        <div hidden={tab !== "my"}>
          <MyBookings
            data={data}
            failed={loadFailed}
            onRetry={load}
            cancelling={cancelling}
            onCancel={cancel}
            onReschedule={setRescheduling}
            onBook={() => switchTab("book")}
          />
        </div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[.07] bg-coal/90 px-3 pt-2 pb-[max(env(safe-area-inset-bottom),10px)] backdrop-blur-xl">
        <div className="mx-auto grid max-w-md grid-cols-2 gap-2">
          {tabs.map(({ id, Icon, label }) => (
            <button
              key={id}
              onClick={() => switchTab(id)}
              aria-current={tab === id ? "page" : undefined}
              className={clsx(
                "relative flex flex-col items-center gap-1 rounded-2xl py-2 text-xs font-semibold transition",
                tab === id ? "bg-white/[.07] text-bone" : "text-fog hover:text-bone",
              )}
            >
              <span className="relative">
                <Icon className={clsx("h-5 w-5", tab === id && "text-forge")} />
                {id === "my" && count > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 grid h-4 min-w-4 place-items-center rounded-full bg-forge px-1 text-[10px] font-bold text-black">
                    {count}
                  </span>
                )}
              </span>
              {label}
            </button>
          ))}
        </div>
      </nav>

      {rescheduling && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed inset-0 z-50 overflow-y-auto bg-ink px-4 pt-4 pb-10"
        >
          <div className="mb-6 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="font-display text-lg font-bold uppercase">{t.app.rescheduleTitle}</h2>
              <p className="mt-1 text-sm text-fog">
                {rescheduling.service} · {rescheduling.date}, {rescheduling.time}
              </p>
              <p className="mt-1 text-xs text-fog/80">{t.app.rescheduleHint}</p>
            </div>
            <IconButton onClick={() => setRescheduling(null)} label={t.common.close}>
              <X className="h-5 w-5" />
            </IconButton>
          </div>
          <BookingWizard
            key={rescheduling.id}
            reschedule={{ id: rescheduling.id, serviceId: rescheduling.serviceId }}
            onRescheduled={() => {
              setRescheduling(null);
              load();
            }}
          />
        </motion.div>
      )}
    </div>
  );
}

function MyBookings({
  data,
  failed,
  onRetry,
  cancelling,
  onCancel,
  onReschedule,
  onBook,
}: {
  data: MyData | null;
  failed: boolean;
  onRetry: () => void;
  cancelling: string | null;
  onCancel: (b: BookingView) => void;
  onReschedule: (b: BookingView) => void;
  onBook: () => void;
}) {
  const { t } = useI18n();

  if (!data) {
    return failed ? (
      <div className="card p-6 text-center">
        <p className="text-sm text-fog">{t.common.networkError}</p>
        <button onClick={onRetry} className="btn-ghost mt-4">
          <RotateCw className="h-4 w-4" /> {t.chat.retry}
        </button>
      </div>
    ) : (
      <div className="card grid h-60 place-items-center">
        <Spinner className="h-6 w-6 text-forge" />
      </div>
    );
  }

  if (!data.upcoming.length && !data.history.length) {
    return (
      <div className="card px-6 py-12 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-forge to-ember text-black shadow-[0_0_50px_-8px_rgba(255,90,31,.7)]">
          <CalendarPlus className="h-7 w-7" />
        </div>
        <h2 className="mt-6 font-display text-xl font-bold uppercase">{t.app.empty}</h2>
        <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-fog">{t.app.emptyText}</p>
        <button onClick={onBook} className="btn-forge mt-6">
          {t.common.book}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section>
        <h2 className="label">{t.app.upcoming}</h2>
        {data.upcoming.length ? (
          <div className="space-y-3">
            {data.upcoming.map((b, i) => (
              <BookingCard
                key={b.id}
                booking={b}
                first={i === 0}
                busy={cancelling === b.id}
                onCancel={() => onCancel(b)}
                onReschedule={() => onReschedule(b)}
              />
            ))}
          </div>
        ) : (
          <div className="card flex items-center justify-between gap-4 p-5 text-sm text-fog">
            {t.app.noUpcoming}
            <button onClick={onBook} className="btn-forge shrink-0 px-4 py-2 text-sm">
              {t.common.book}
            </button>
          </div>
        )}
      </section>
      {data.history.length > 0 && (
        <section>
          <h2 className="label">{t.app.history}</h2>
          <div className="space-y-3">
            {data.history.map((b) => (
              <BookingCard key={b.id} booking={b} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function BookingCard({
  booking: b,
  first,
  busy,
  onCancel,
  onReschedule,
}: {
  booking: BookingView;
  first?: boolean;
  busy?: boolean;
  onCancel?: () => void;
  onReschedule?: () => void;
}) {
  const { t, locale } = useI18n();
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={clsx(
        "card relative overflow-hidden p-5",
        first && "border-forge/40 shadow-[0_20px_60px_-30px_rgba(255,90,31,.6)]",
        !onCancel && "opacity-70",
      )}
    >
      <span className="absolute inset-y-0 left-0 w-1" style={{ background: b.color }} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {first && <div className="eyebrow mb-2">{t.app.next}</div>}
          <h3 className="font-display text-base leading-tight font-semibold">{b.service}</h3>
        </div>
        <span className={clsx("shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold", STATUS_STYLE[b.status])}>
          {t.app.status[b.status]}
        </span>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <Field label={t.booking.date}>{b.date}</Field>
        <Field label={t.booking.time}>
          <span className="tabular-nums">{b.time}</span>
        </Field>
        <Field label={t.booking.master}>
          <span className="flex min-w-0 items-center gap-2">
            <Avatar name={b.master} color={b.color} size={22} />
            <span className="truncate">{b.master}</span>
          </span>
        </Field>
        <Field label={t.booking.cost}>
          <Price amount={b.price} locale={locale} />
        </Field>
      </dl>
      {onCancel && b.confirmed && (
        <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
          <Check className="h-3.5 w-3.5" /> {t.app.visitConfirmed}
        </div>
      )}
      {onCancel && (
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button onClick={onReschedule} className="btn-ghost px-3 py-2.5 text-sm leading-tight">
            <CalendarClock className="h-4 w-4 shrink-0" /> {t.app.reschedule}
          </button>
          <button
            onClick={onCancel}
            disabled={busy}
            className="btn-ghost px-3 py-2.5 text-sm leading-tight text-red-300 hover:border-red-400/40 hover:bg-red-500/5"
          >
            {busy ? <Spinner /> : <X className="h-4 w-4 shrink-0" />} {t.app.cancel}
          </button>
        </div>
      )}
    </motion.article>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-fog">{label}</dt>
      <dd className="mt-0.5 font-semibold">{children}</dd>
    </div>
  );
}

function OutsideTelegram() {
  const { t, locale } = useI18n();
  return (
    <div className="grid min-h-dvh place-items-center px-5">
      <div className="card max-w-sm p-8 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-forge to-ember text-black">
          <Send className="h-7 w-7" />
        </div>
        <h1 className="mt-6 font-display text-xl font-bold uppercase">{t.app.tgOnlyTitle}</h1>
        <p className="mt-2 text-sm leading-relaxed text-fog">{t.app.tgOnlyText}</p>
        <div className="mt-7 flex flex-col gap-3">
          <a href={`https://t.me/${BUSINESS.telegramBot}`} className="btn-forge">
            {t.app.openBot}
          </a>
          <Link href={`/${locale}/book`} className="btn-ghost">
            {t.app.bookOnSite}
          </Link>
        </div>
      </div>
    </div>
  );
}
