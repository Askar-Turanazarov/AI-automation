"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import Link from "next/link";
import { Price } from "@/components/Price";
import { useI18n } from "@/i18n/client";
import type { Done } from "./types";

export function BookingDone({
  done,
  inTelegram,
  onClose,
  onAgain,
}: {
  done: Done;
  inTelegram: boolean;
  onClose: () => void;
  onAgain: () => void;
}) {
  const { t, locale } = useI18n();
  const b = t.booking;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="card mx-auto max-w-xl p-8 text-center sm:p-12"
    >
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
        {[
          [b.service, done.service],
          [b.master, done.master],
          [b.when, `${done.date}, ${done.time}`],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4">
            <span className="text-fog">{k}</span>
            <span className="text-right font-semibold">{v}</span>
          </div>
        ))}
        <div className="flex justify-between gap-4">
          <span className="text-fog">{b.cost}</span>
          <Price amount={done.price} locale={locale} align="right" mainClassName="font-semibold" />
        </div>
      </div>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {inTelegram ? (
          <button onClick={onClose} className="btn-forge">
            {b.ok}
          </button>
        ) : (
          <Link href={`/${locale}`} className="btn-forge">
            {b.home}
          </Link>
        )}
        <button onClick={onAgain} className="btn-ghost">
          {b.again}
        </button>
      </div>
    </motion.div>
  );
}
