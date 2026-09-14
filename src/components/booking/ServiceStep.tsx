"use client";

import clsx from "clsx";
import { Clock } from "lucide-react";
import { Price } from "@/components/Price";
import { useI18n } from "@/i18n/client";
import { formatDuration } from "@/i18n/dates";
import type { Service } from "./types";

export function ServiceStep(p: {
  categories: string[];
  category: string | null;
  onCategory: (c: string | null) => void;
  services: Service[];
  serviceId: string | null;
  onPick: (s: Service) => void;
}) {
  const { t, locale } = useI18n();
  return (
    <div>
      <div className="scrollbar-none -mx-1 mb-5 flex gap-2 overflow-x-auto px-1">
        {[null, ...p.categories].map((c) => (
          <button key={c ?? "all"} onClick={() => p.onCategory(c)} className={clsx("shrink-0 rounded-full border px-4 py-2 text-sm transition", p.category === c ? "border-forge bg-forge/15 text-bone" : "border-white/10 text-fog hover:text-bone")}>
            {c ?? t.common.all}
          </button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {p.services.map((s) => (
          <button
            key={s.id}
            onClick={() => p.onPick(s)}
            className={clsx("card group p-5 text-left transition hover:-translate-y-0.5 hover:border-forge/50", p.serviceId === s.id && "!border-forge ring-4 ring-forge/10")}
          >
            <div className="text-xs uppercase tracking-wider text-fog">{s.category}</div>
            <div className="mt-1.5 font-display font-semibold">{s.name}</div>
            <p className="mt-2 line-clamp-2 text-sm text-fog">{s.description}</p>
            <div className="mt-4 flex items-end justify-between text-sm">
              <span className="flex items-center gap-1.5 pb-0.5 text-fog"><Clock className="h-3.5 w-3.5" /> {formatDuration(s.durationMin, t.common)}</span>
              <Price amount={s.price} locale={locale} align="right" mainClassName="font-display font-semibold text-ember" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
