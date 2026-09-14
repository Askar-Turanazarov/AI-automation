"use client";

import clsx from "clsx";
import { Price } from "@/components/Price";
import { useI18n } from "@/i18n/client";
import { formatDate, formatDuration } from "@/i18n/dates";
import { formatTimeRange } from "@/lib/time";
import type { Service } from "./types";

export function BookingSummary({
  service,
  date,
  time,
  master,
}: {
  service?: Service;
  date: string | null;
  time: number | null;
  master?: string | null;
}) {
  const { t, locale } = useI18n();
  const b = t.booking;
  return (
    <aside className="lg:sticky lg:top-24 lg:self-start">
      <div className="card relative overflow-hidden p-6">
        <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-forge/20 blur-3xl" />
        <div className="relative">
          <div className="eyebrow">{b.summary}</div>
          <div className="mt-5 space-y-4 text-sm">
            <Row k={b.service} v={service?.name} />
            <Row k={b.duration} v={service && formatDuration(service.durationMin, t.common)} />
            <Row k={b.date} v={date && formatDate(date, locale)} />
            <Row k={b.time} v={time != null && service ? formatTimeRange(time, time + service.durationMin) : null} />
            <Row k={b.master} v={master} />
          </div>
          <div className="mt-6 flex items-end justify-between border-t border-white/[.07] pt-5">
            <span className="pb-1 text-fog">{b.total}</span>
            {service ? (
              <Price amount={service.price} locale={locale} align="right" mainClassName="font-display text-2xl font-bold" />
            ) : (
              <span className="font-display text-2xl font-bold">—</span>
            )}
          </div>
        </div>
      </div>
    </aside>
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
