"use client";

import { motion, useMotionValue, useMotionValueEvent, useReducedMotion, useSpring, useTransform, type MotionValue } from "framer-motion";
import { ArrowRight, Hand, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { useI18n } from "@/i18n/client";

const CX = 200;
const CY = 200;
const IDLE = 850;
const MAX_RPM = 8000;

// округление — иначе float на сервере и клиенте расходится (hydration mismatch)
const r2 = (n: number) => Math.round(n * 100) / 100;
const polar = (deg: number, r: number) => {
  const rad = ((deg - 90) * Math.PI) / 180;
  return [r2(CX + r * Math.cos(rad)), r2(CY + r * Math.sin(rad))] as const;
};
const angleOf = (rpm: number) => -120 + (Math.min(Math.max(rpm, 0), MAX_RPM) / MAX_RPM) * 240;

function arc(fromRpm: number, toRpm: number, r: number) {
  const [x1, y1] = polar(angleOf(fromRpm), r);
  const [x2, y2] = polar(angleOf(toRpm), r);
  const large = angleOf(toRpm) - angleOf(fromRpm) > 180 ? 1 : 0;
  return `M${x1} ${y1} A${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
}

/**
 * Модель двигателя: «педаль газа» задаёт целевые обороты, а стрелка догоняет их через пружину
 * (инерция и небольшой перелёт, как у настоящего тахометра).
 * Сценарий: запуск → холостые с дрожанием → перегазовки → разгон по передачам с переключением → сброс.
 */
function useEngine(): { rpm: MotionValue<number>; rev: () => void } {
  const reduced = useReducedMotion();
  const throttle = useMotionValue(0);
  const rpm = useSpring(throttle, { stiffness: 160, damping: 15, mass: 0.8 });
  const holdUntil = useRef(0);

  useEffect(() => {
    if (reduced) {
      rpm.jump(IDLE);
      return;
    }
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const sleep = (ms: number) => new Promise<void>((resolve) => (timer = setTimeout(resolve, ms)));
    const rand = (a: number, b: number) => a + Math.random() * (b - a);
    // ручная перегазовка на короткое время имеет приоритет над сценарием
    const set = (v: number) => {
      if (performance.now() >= holdUntil.current) throttle.set(v);
    };

    async function idle(ms: number) {
      const end = performance.now() + ms;
      while (alive && performance.now() < end) {
        set(IDLE + rand(-30, 30));
        await sleep(rand(110, 180));
      }
    }
    async function ramp(from: number, to: number, ms: number) {
      const start = performance.now();
      while (alive) {
        const k = Math.min(1, (performance.now() - start) / ms);
        set(from + (to - from) * Math.pow(k, 1.25));
        if (k >= 1) return;
        await sleep(32);
      }
    }
    async function blip(peak: number) {
      set(peak);
      await sleep(rand(170, 240));
      set(IDLE);
    }
    async function pull() {
      await ramp(IDLE, 6900, 1700); // 2-я передача
      set(4700); // переключение
      await sleep(190);
      await ramp(4700, 7300, 1500); // 3-я передача до отсечки
      set(7150);
      await sleep(120);
      set(IDLE); // сброс газа
    }

    (async () => {
      await sleep(500);
      set(1500); // запуск двигателя
      await sleep(450);
      while (alive) {
        await idle(rand(1400, 2400));
        await blip(rand(3300, 4600));
        await idle(rand(900, 1500));
        if (Math.random() < 0.5) {
          await blip(rand(2600, 3600));
          await idle(rand(600, 900));
        }
        await pull();
        await idle(rand(2400, 3400));
      }
    })();

    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [reduced, rpm, throttle]);

  const rev = () => {
    holdUntil.current = performance.now() + 420;
    throttle.set(7600);
    setTimeout(() => throttle.set(IDLE), 260);
  };

  return { rpm, rev };
}

function Tachometer() {
  const { t } = useI18n();
  const { rpm, rev } = useEngine();
  const angle = useTransform(rpm, angleOf);
  const redline = useTransform(rpm, [6000, 6900], [0.4, 1]);
  const shiftLight = useTransform(rpm, [6500, 7000], [0.06, 1]);
  const readout = useRef<SVGTextElement>(null);

  useMotionValueEvent(rpm, "change", (v) => {
    if (readout.current) readout.current.textContent = String(Math.max(0, Math.round(v / 10) * 10));
  });

  const ticks = Array.from({ length: 81 }, (_, i) => i * 100);

  return (
    <svg
      viewBox="0 0 400 400"
      className="h-full w-full cursor-pointer touch-manipulation select-none"
      onClick={rev}
      role="img"
      aria-label={t.hero.gaugeHint}
    >
      <defs>
        <linearGradient id="tach-red" x1="0" x2="1">
          <stop offset="0" stopColor="#ff5a1f" />
          <stop offset="1" stopColor="#ff2a00" />
        </linearGradient>
        <radialGradient id="tach-face" cx="50%" cy="45%" r="55%">
          <stop offset="0" stopColor="#1d1d24" />
          <stop offset="1" stopColor="#0a0a0d" />
        </radialGradient>
        <linearGradient id="tach-needle" x1="0" x2="0" y1="1" y2="0">
          <stop offset="0" stopColor="#c2410c" />
          <stop offset="0.55" stopColor="#ff5a1f" />
          <stop offset="1" stopColor="#ffb020" />
        </linearGradient>
        <radialGradient id="tach-hub" cx="40%" cy="35%" r="70%">
          <stop offset="0" stopColor="#3a3a44" />
          <stop offset="1" stopColor="#101014" />
        </radialGradient>
        <filter id="tach-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.5" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <circle cx={CX} cy={CY} r="190" fill="url(#tach-face)" stroke="rgba(255,255,255,.09)" />
      <circle cx={CX} cy={CY} r="179" fill="none" stroke="rgba(255,255,255,.035)" strokeWidth="10" />
      <path d={arc(0, 6500, 160)} fill="none" stroke="rgba(255,255,255,.14)" strokeWidth="2" />
      <motion.path d={arc(6500, 8000, 160)} fill="none" stroke="url(#tach-red)" strokeWidth="10" strokeLinecap="round" style={{ opacity: redline }} />

      {ticks.map((v) => {
        const major = v % 1000 === 0;
        const mid = v % 500 === 0;
        const [x1, y1] = polar(angleOf(v), 150);
        const [x2, y2] = polar(angleOf(v), major ? 127 : mid ? 137 : 144);
        return (
          <line key={v} x1={x1} y1={y1} x2={x2} y2={y2} stroke={v >= 6500 ? "#ff5a1f" : major ? "#ededf0" : "rgba(255,255,255,.35)"} strokeWidth={major ? 3 : mid ? 1.8 : 1.1} />
        );
      })}
      {Array.from({ length: 9 }, (_, i) => {
        const [x, y] = polar(angleOf(i * 1000), 107);
        return (
          <text key={i} x={x} y={y + 6} textAnchor="middle" fontSize="18" fontFamily="var(--font-unbounded)" fill={i >= 7 ? "#ff5a1f" : "#cfcfd6"}>
            {i}
          </text>
        );
      })}

      {/* лампа переключения передач */}
      <motion.circle cx={CX} cy={128} r="5" fill="#ff5a1f" style={{ opacity: shiftLight, filter: "drop-shadow(0 0 6px #ff5a1f)" }} />

      {/* цифровые обороты */}
      <text ref={readout} x={CX} y={CY + 64} textAnchor="middle" fontSize="22" fontWeight="600" fontFamily="var(--font-unbounded)" fill="#ededf0" style={{ fontVariantNumeric: "tabular-nums" }}>
        0
      </text>
      <text x={CX} y={CY + 81} textAnchor="middle" fontSize="9" letterSpacing="2.5" fill="#8b8b98" fontFamily="var(--font-unbounded)">
        {t.hero.gaugeUnit.toUpperCase()}
      </text>
      <text x={CX} y={CY + 128} textAnchor="middle" fontSize="30" fontWeight="700" fontFamily="var(--font-unbounded)" fill="#ededf0">
        650
      </text>
      <text x={CX} y={CY + 147} textAnchor="middle" fontSize="10" letterSpacing="1.5" fill="#8b8b98">
        {t.hero.gaugeHp.toUpperCase()}
      </text>

      {/* стрелка: сужается к кончику, с противовесом */}
      <motion.g style={{ rotate: angle, transformOrigin: `${CX}px ${CY}px` }}>
        <polygon points="198.9,52 201.1,52 205.2,200 203.6,230 196.4,230 194.8,200" fill="url(#tach-needle)" filter="url(#tach-glow)" />
        <line x1={CX} y1={60} x2={CX} y2={192} stroke="rgba(255,255,255,.5)" strokeWidth="0.7" />
      </motion.g>
      <circle cx={CX} cy={CY} r="19" fill="url(#tach-hub)" stroke="#2c2c35" strokeWidth="1.5" />
      <circle cx={CX} cy={CY} r="6.5" fill="#0b0b0e" stroke="#ff5a1f" strokeWidth="2" />
      <ellipse cx={CX - 5} cy={CY - 8} rx="7" ry="3" fill="rgba(255,255,255,.1)" />
    </svg>
  );
}

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
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mt-7 max-w-xl text-lg leading-relaxed text-fog">
            {h.lead}
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="mt-9 flex flex-wrap gap-3">
            <Link href={`/${locale}/book`} className="btn-forge text-base">
              {h.ctaBook} <ArrowRight className="h-4 w-4" />
            </Link>
            <button onClick={() => window.dispatchEvent(new Event("open-chat"))} className="btn-ghost text-base">
              <Sparkles className="h-4 w-4 text-ember" /> {h.ctaAi}
            </button>
          </motion.div>
          <div className="mt-14 grid max-w-2xl grid-cols-2 gap-6 sm:grid-cols-4">
            {h.stats.map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 + i * 0.08 }}>
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
