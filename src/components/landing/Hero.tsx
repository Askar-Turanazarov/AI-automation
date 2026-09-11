"use client";

import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";

const CX = 200;
const CY = 200;
const polar = (deg: number, r: number) => {
  const rad = ((deg - 90) * Math.PI) / 180;
  // округление — иначе float на сервере и клиенте расходится (hydration mismatch)
  const round = (n: number) => Math.round(n * 100) / 100;
  return [round(CX + r * Math.cos(rad)), round(CY + r * Math.sin(rad))] as const;
};
const angleOf = (rpm: number) => -120 + (rpm / 8000) * 240;

function arc(fromRpm: number, toRpm: number, r: number) {
  const [x1, y1] = polar(angleOf(fromRpm), r);
  const [x2, y2] = polar(angleOf(toRpm), r);
  const large = angleOf(toRpm) - angleOf(fromRpm) > 180 ? 1 : 0;
  return `M${x1} ${y1} A${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
}

function Tachometer() {
  const ticks = Array.from({ length: 81 }, (_, i) => i * 100);
  return (
    <svg viewBox="0 0 400 400" className="h-full w-full" aria-hidden>
      <defs>
        <linearGradient id="red" x1="0" x2="1">
          <stop offset="0" stopColor="#ff5a1f" />
          <stop offset="1" stopColor="#ff2a00" />
        </linearGradient>
        <radialGradient id="face" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#1b1b22" />
          <stop offset="1" stopColor="#0b0b0e" />
        </radialGradient>
      </defs>
      <circle cx={CX} cy={CY} r="188" fill="url(#face)" stroke="rgba(255,255,255,.08)" />
      <circle cx={CX} cy={CY} r="178" fill="none" stroke="rgba(255,255,255,.04)" strokeWidth="10" />
      <path d={arc(0, 6500, 160)} fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="2" />
      <path d={arc(6500, 8000, 160)} fill="none" stroke="url(#red)" strokeWidth="10" strokeLinecap="round" className="animate-glow" />
      {ticks.map((rpm) => {
        const major = rpm % 1000 === 0;
        const mid = rpm % 500 === 0;
        const [x1, y1] = polar(angleOf(rpm), 150);
        const [x2, y2] = polar(angleOf(rpm), major ? 128 : mid ? 138 : 144);
        return <line key={rpm} x1={x1} y1={y1} x2={x2} y2={y2} stroke={rpm >= 6500 ? "#ff5a1f" : major ? "#ededf0" : "rgba(255,255,255,.35)"} strokeWidth={major ? 3 : 1.2} />;
      })}
      {Array.from({ length: 9 }, (_, i) => {
        const [x, y] = polar(angleOf(i * 1000), 108);
        return (
          <text key={i} x={x} y={y + 6} textAnchor="middle" fontSize="18" fontFamily="var(--font-unbounded)" fill={i >= 7 ? "#ff5a1f" : "#cfcfd6"}>
            {i}
          </text>
        );
      })}
      <text x={CX} y={CY + 70} textAnchor="middle" fontSize="11" letterSpacing="3" fill="#8b8b98" fontFamily="var(--font-unbounded)">
        RPM ×1000
      </text>
      <motion.g
        style={{ transformOrigin: `${CX}px ${CY}px` }}
        initial={{ rotate: -120 }}
        animate={{ rotate: [-120, 112, 70, 98, 84, 104, 90] }}
        transition={{ duration: 6, times: [0, 0.22, 0.4, 0.55, 0.7, 0.85, 1], ease: "easeInOut", repeat: Infinity, repeatType: "mirror", repeatDelay: 0.4 }}
      >
        <line x1={CX} y1={CY + 22} x2={CX} y2={CY - 150} stroke="#ff5a1f" strokeWidth="4" strokeLinecap="round" style={{ filter: "drop-shadow(0 0 6px #ff5a1f)" }} />
      </motion.g>
      <circle cx={CX} cy={CY} r="16" fill="#18181e" stroke="#ff5a1f" strokeWidth="2" />
      <text x={CX} y={CY + 118} textAnchor="middle" fontSize="34" fontWeight="700" fontFamily="var(--font-unbounded)" fill="#ededf0">
        650
      </text>
      <text x={CX} y={CY + 140} textAnchor="middle" fontSize="11" letterSpacing="2" fill="#8b8b98">
        Л.С. ПОСЛЕ STAGE 2
      </text>
    </svg>
  );
}

const STATS = [
  ["1 200+", "проектов"],
  ["12 лет", "в тюнинге"],
  ["+38%", "средний прирост мощности"],
  ["4.9★", "рейтинг клиентов"],
];

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-28 pb-16 md:pt-36">
      <div className="grid-bg absolute inset-0" />
      <div className="absolute -top-40 right-[-10%] h-[600px] w-[600px] rounded-full bg-forge/20 blur-[140px]" />
      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 lg:grid-cols-[1.15fr_.85fr]">
        <div>
          <motion.span initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="eyebrow">
            <span className="h-px w-8 bg-forge" /> Тюнинг-ателье полного цикла
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, duration: 0.7 }}
            className="mt-6 font-display text-[clamp(2.4rem,6.4vw,5.6rem)] font-bold uppercase leading-[.92] tracking-tight"
          >
            <span className="text-chrome">Куём</span>
            <br />
            <span className="text-molten">характер</span>
            <br />
            <span className="text-chrome">твоей машины</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mt-7 max-w-xl text-lg leading-relaxed text-fog">
            Чип-тюнинг, выхлоп, подвеска, PPF и интерьер под ключ. Прозрачные цены, замер на диностенде и гарантия 12 месяцев.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="mt-9 flex flex-wrap gap-3">
            <Link href="/book" className="btn-forge text-base">
              Записаться онлайн <ArrowRight className="h-4 w-4" />
            </Link>
            <button onClick={() => window.dispatchEvent(new Event("open-chat"))} className="btn-ghost text-base">
              <Sparkles className="h-4 w-4 text-ember" /> Спросить ИИ-консультанта
            </button>
          </motion.div>
          <div className="mt-14 grid max-w-2xl grid-cols-2 gap-6 sm:grid-cols-4">
            {STATS.map(([v, l], i) => (
              <motion.div key={l} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 + i * 0.08 }}>
                <div className="font-display text-2xl font-semibold">{v}</div>
                <div className="mt-1 text-sm text-fog">{l}</div>
              </motion.div>
            ))}
          </div>
        </div>
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, delay: 0.15 }}
          className="relative mx-auto aspect-square w-full max-w-[480px]"
        >
          <div className="absolute inset-6 rounded-full bg-forge/10 blur-3xl" />
          <Tachometer />
        </motion.div>
      </div>
    </section>
  );
}
