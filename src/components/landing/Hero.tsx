"use client";

import { motion } from "framer-motion";
import { ArrowRight, Hand, Sparkles } from "lucide-react";
import Link from "next/link";
import { useI18n } from "@/i18n/client";
import { Tachometer } from "./Tachometer";

export function Hero() {
  const { t, locale } = useI18n();
  const h = t.hero;
  return (
    <section className="relative overflow-hidden pt-28 pb-16 md:pt-36">
      <div className="grid-bg absolute inset-0" />
      <div className="absolute -top-40 right-[-10%] h-[600px] w-[600px] rounded-full bg-forge/20 blur-[140px]" />
      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 lg:grid-cols-[1.15fr_.85fr]">
        <div>
          <motion.span initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="eyebrow">
            <span className="h-px w-8 bg-forge" /> {h.eyebrow}
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, duration: 0.7 }}
            className={`mt-6 font-display font-bold uppercase leading-[.95] tracking-tight ${locale === "ru" ? "text-[clamp(2.4rem,6.4vw,5.6rem)]" : "text-[clamp(2.1rem,5.6vw,4.9rem)]"}`}
          >
            <span className="text-chrome">{h.title[0]}</span>
            <br />
            <span className="text-molten">{h.title[1]}</span>
            <br />
            <span className="text-chrome">{h.title[2]}</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-7 max-w-xl text-lg leading-relaxed text-fog"
          >
            {h.lead}
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-9 flex flex-wrap gap-3"
          >
            <Link href={`/${locale}/book`} className="btn-forge text-base">
              {h.ctaBook} <ArrowRight className="h-4 w-4" />
            </Link>
            <button onClick={() => window.dispatchEvent(new Event("open-chat"))} className="btn-ghost text-base">
              <Sparkles className="h-4 w-4 text-ember" /> {h.ctaAi}
            </button>
          </motion.div>
          <div className="mt-14 grid max-w-2xl grid-cols-2 gap-6 sm:grid-cols-4">
            {h.stats.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + i * 0.08 }}
              >
                <div className="font-display text-2xl font-semibold">{s.value}</div>
                <div className="mt-1 text-sm text-fog">{s.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, delay: 0.15 }}
          className="relative mx-auto w-full max-w-[480px]"
        >
          <div className="relative aspect-square">
            <div className="absolute inset-6 rounded-full bg-forge/10 blur-3xl" />
            <Tachometer />
          </div>
          <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-fog">
            <Hand className="h-3.5 w-3.5" /> {h.gaugeHint}
          </p>
        </motion.div>
      </div>
    </section>
  );
}
