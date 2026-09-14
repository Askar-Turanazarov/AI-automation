"use client";

import clsx from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, CalendarCheck, Clock, MessageCircle, RotateCcw, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Price } from "@/components/Price";
import { chipClass } from "@/components/ui";
import { tpl } from "@/i18n";
import { useI18n } from "@/i18n/client";
import { formatDuration } from "@/i18n/dates";
import type { QuizBudget, QuizGoal, QuizResult } from "@/lib/ai/quiz";
import { sendJson } from "@/lib/http";
import { SectionHeading } from "./SectionHeading";

/** Квиз «Подбор тюнинга»: авто → цели → бюджет → пакет услуг с ценами и записью */
export function TuningQuiz() {
  const { t, locale } = useI18n();
  const q = t.quiz;
  const [step, setStep] = useState(0);
  const [car, setCar] = useState("");
  const [goals, setGoals] = useState<QuizGoal[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [error, setError] = useState("");

  const toggleGoal = (g: QuizGoal) => setGoals((list) => (list.includes(g) ? list.filter((x) => x !== g) : [...list, g]));

  async function submit(budget: QuizBudget) {
    setLoading(true);
    setError("");
    const res = await sendJson<QuizResult>("/api/quiz", "POST", { car, goals, budget, locale }, t.common);
    setLoading(false);
    if (res.ok) setResult(res.data);
    else setError(res.error);
  }

  function reset() {
    setStep(0);
    setGoals([]);
    setResult(null);
    setError("");
  }

  // чат-консультант откроется с готовым вопросом по подобранному пакету
  function discuss() {
    const services = result?.items.map((s) => s.name).join(", ") || goals.map((g) => q.goals[g].label).join(", ");
    window.dispatchEvent(new CustomEvent("open-chat", { detail: tpl(q.chatPrompt, { car: car.trim() || q.yourCar, services }) }));
  }

  const view = loading ? "loading" : result ? "result" : `step-${step}`;

  return (
    <section id="quiz" className="mx-auto max-w-7xl scroll-mt-24 px-5 py-24 md:py-32">
      <SectionHeading text={q} />
      <div className="card relative mt-14 overflow-hidden p-6 md:p-10">
        <div className="pointer-events-none absolute -top-32 -right-32 h-80 w-80 rounded-full bg-forge/15 blur-3xl" />
        <div className="relative">
          {!result && !loading && (
            <ol className="mb-8 flex items-center gap-3">
              {q.steps.map((label, i) => (
                <li key={label} className="flex items-center gap-3">
                  <span
                    className={clsx(
                      "grid h-7 w-7 place-items-center rounded-full text-xs font-bold",
                      i < step ? "bg-forge text-black" : i === step ? "bg-bone text-black" : "border border-white/15 text-fog",
                    )}
                  >
                    {i + 1}
                  </span>
                  <span className={clsx("hidden text-sm sm:inline", i === step ? "text-bone" : "text-fog")}>{label}</span>
                  {i < q.steps.length - 1 && <span className="h-px w-6 bg-white/10 sm:w-10" />}
                </li>
              ))}
            </ol>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
            >
              {loading ? (
                <div className="grid place-items-center py-12 text-center">
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                    className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-forge to-ember text-black shadow-[0_0_50px_-8px_rgba(255,90,31,.7)]"
                  >
                    <Sparkles className="h-6 w-6" />
                  </motion.div>
                  <p className="mt-5 text-fog">{q.thinking}</p>
                </div>
              ) : result ? (
                <QuizResultView result={result} onDiscuss={discuss} onReset={reset} />
              ) : step === 0 ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setStep(1);
                  }}
                  className="max-w-2xl"
                >
                  <label htmlFor="quiz-car" className="font-display text-xl font-semibold md:text-2xl">
                    {q.carLabel}
                  </label>
                  <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                    <input
                      id="quiz-car"
                      value={car}
                      onChange={(e) => setCar(e.target.value)}
                      maxLength={80}
                      placeholder={q.carPh}
                      className="input"
                    />
                    <button className="btn-forge shrink-0">
                      {q.next} <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </form>
              ) : step === 1 ? (
                <div>
                  <h3 className="font-display text-xl font-semibold md:text-2xl">{q.goalsLabel}</h3>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {(Object.keys(q.goals) as QuizGoal[]).map((g) => (
                      <button
                        key={g}
                        onClick={() => toggleGoal(g)}
                        aria-pressed={goals.includes(g)}
                        className={chipClass(goals.includes(g), "px-4 py-2.5 text-sm")}
                      >
                        {q.goals[g].label}
                      </button>
                    ))}
                  </div>
                  <div className="mt-8 flex gap-3">
                    <button onClick={() => setStep(0)} className="btn-ghost">
                      {t.common.back}
                    </button>
                    <button disabled={!goals.length} onClick={() => setStep(2)} className="btn-forge">
                      {q.next} <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <h3 className="font-display text-xl font-semibold md:text-2xl">{q.budgetLabel}</h3>
                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    {(Object.keys(q.budgets) as QuizBudget[]).map((b) => (
                      <button
                        key={b}
                        onClick={() => submit(b)}
                        className="rounded-2xl border border-white/10 bg-white/[.02] p-5 text-left font-display text-lg font-semibold transition hover:-translate-y-0.5 hover:border-forge/50 hover:bg-forge/5"
                      >
                        {q.budgets[b]}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setStep(1)} className="btn-ghost mt-8">
                    {t.common.back}
                  </button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {error && (
            <p role="alert" className="mt-4 text-sm text-red-300">
              {error}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function QuizResultView({ result, onDiscuss, onReset }: { result: QuizResult; onDiscuss: () => void; onReset: () => void }) {
  const { t, locale } = useI18n();
  const q = t.quiz;
  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="font-display text-2xl font-bold uppercase">{q.resultTitle}</h3>
        {result.ai && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-forge/15 px-3 py-1 text-xs font-semibold text-forge">
            <Sparkles className="h-3.5 w-3.5" /> {q.aiBadge}
          </span>
        )}
      </div>
      <p className="mt-3 max-w-3xl leading-relaxed text-fog">{result.summary}</p>

      {result.items.length ? (
        <>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {result.items.map((s, i) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="flex flex-col rounded-2xl border border-white/[.08] bg-white/[.02] p-5"
              >
                <div className="text-xs tracking-[.16em] text-fog uppercase">{s.category}</div>
                <div className="mt-1 font-display text-lg leading-tight font-semibold">{s.name}</div>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-fog">{s.why}</p>
                <div className="mt-4 flex items-end justify-between gap-3 border-t border-white/[.06] pt-4">
                  <div>
                    <Price amount={s.price} locale={locale} mainClassName="font-display font-semibold" />
                    <div className="mt-1 flex items-center gap-1 text-xs text-fog">
                      <Clock className="h-3.5 w-3.5" /> {formatDuration(s.durationMin, t.common)}
                    </div>
                  </div>
                  <Link href={`/${locale}/book?service=${s.id}`} className="btn-forge shrink-0 !px-4 !py-2 text-sm">
                    <CalendarCheck className="h-4 w-4" /> {q.book}
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-forge/25 bg-forge/5 px-5 py-4">
            <div>
              <div className="text-sm text-fog">{q.total}</div>
              <Price amount={result.total} locale={locale} mainClassName="font-display text-2xl font-bold text-molten" />
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={onDiscuss} className="btn-ghost">
                <MessageCircle className="h-4 w-4" /> {q.discuss}
              </button>
              <button onClick={onReset} className="btn-ghost">
                <RotateCcw className="h-4 w-4" /> {q.again}
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <p className="w-full text-fog">{q.noMatch}</p>
          <button onClick={onDiscuss} className="btn-forge">
            <MessageCircle className="h-4 w-4" /> {q.discuss}
          </button>
          <button onClick={onReset} className="btn-ghost">
            <RotateCcw className="h-4 w-4" /> {q.again}
          </button>
        </div>
      )}
    </div>
  );
}
