import { ArrowRight, ArrowUpRight, Clock, Gauge, MapPin, Phone, Send, ShieldCheck, Wrench } from "lucide-react";
import Link from "next/link";
import { ChatWidget } from "@/components/landing/ChatWidget";
import { Hero } from "@/components/landing/Hero";
import { Reveal } from "@/components/landing/Reveal";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { Avatar, Logo } from "@/components/ui";
import { BUSINESS } from "@/lib/business";
import { prisma } from "@/lib/db";
import { formatPrice } from "@/lib/time";

export const revalidate = 60;

const BRANDS = ["BMW M", "Toyota GR", "Nissan", "Audi RS", "Porsche", "Mercedes-AMG", "Lexus F", "Subaru", "Volkswagen R", "Kia GT"];

const PROJECTS = [
  { car: "BMW M3 Competition G80", work: "Stage 2 · даунпайп · выхлоп Akrapovič", from: 510, to: 650, tag: "Двигатель" },
  { car: "Toyota Supra A90", work: "Stage 2 · интеркулер · койловеры KW", from: 387, to: 540, tag: "Двигатель" },
  { car: "Audi RS6 C8", work: "Stage 1 · пневмоподвеска · PPF матовый", from: 600, to: 760, tag: "Под ключ" },
];

const PROCESS = [
  ["01", "Заявка", "Онлайн-запись, бот или ИИ-консультант — подберём услугу и мастера за минуту."],
  ["02", "Диагностика", "Проверяем авто и делаем замер на диностенде, чтобы видеть реальную точку старта."],
  ["03", "Работа", "Мастер держит вас в курсе: фото и видео этапов прямо в Telegram."],
  ["04", "Выдача", "Финальный замер, отчёт «до/после» и гарантия 12 месяцев на все работы."],
];

const REVIEWS = [
  ["Ерлан, Supra A90", "Сделали Stage 2 — машина стала другой. Отдельный респект за график замера и честные цифры."],
  ["Мадина, Lexus IS", "Оклеили PPF и сделали керамику. Записалась через бота за 30 секунд, всё вовремя и идеально."],
  ["Игорь, Golf R", "ИИ-консультант ночью подобрал подвеску и записал к Дмитрию. Утром уже был в боксе."],
];

export default async function Home() {
  const [services, masters] = await Promise.all([
    prisma.service.findMany({ where: { active: true }, orderBy: [{ category: "asc" }, { price: "asc" }] }),
    prisma.master.findMany({ where: { active: true }, orderBy: { createdAt: "asc" }, include: { services: { include: { service: true } } } }),
  ]);
  const categories = [...new Set(services.map((s) => s.category))];

  return (
    <main className="overflow-x-clip">
      <SiteHeader />
      <Hero />

      {/* marquee */}
      <div className="relative border-y border-white/[.06] bg-coal py-5">
        <div className="flex w-max animate-marquee gap-12 whitespace-nowrap">
          {[...BRANDS, ...BRANDS].map((b, i) => (
            <span key={i} className="flex items-center gap-12 font-display text-sm uppercase tracking-[.25em] text-fog/70">
              {b} <span className="text-forge">✦</span>
            </span>
          ))}
        </div>
      </div>

      {/* services */}
      <section id="services" className="mx-auto max-w-7xl px-5 py-24 md:py-32">
        <Reveal>
          <span className="eyebrow"><span className="h-px w-8 bg-forge" /> Услуги</span>
          <div className="mt-5 flex flex-wrap items-end justify-between gap-6">
            <h2 className="max-w-2xl font-display text-4xl font-bold uppercase leading-none md:text-6xl">
              Всё для <span className="text-molten">прокачки</span>
            </h2>
            <p className="max-w-md text-fog">Фиксированные цены без сюрпризов. Длительность указана точно — календарь покажет свободное время мастера.</p>
          </div>
        </Reveal>
        <div className="mt-14 space-y-12">
          {categories.map((cat) => (
            <div key={cat}>
              <div className="mb-5 flex items-center gap-4">
                <h3 className="font-display text-sm uppercase tracking-[.2em] text-fog">{cat}</h3>
                <div className="h-px flex-1 bg-white/[.06]" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {services.filter((s) => s.category === cat).map((s, i) => (
                  <Reveal key={s.id} delay={i * 0.05}>
                    <Link
                      href={`/book?service=${s.id}`}
                      className="card group relative flex h-full flex-col overflow-hidden p-6 transition duration-300 hover:-translate-y-1 hover:border-forge/40"
                    >
                      <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-forge/0 blur-3xl transition duration-500 group-hover:bg-forge/25" />
                      <div className="flex items-start justify-between gap-4">
                        <h4 className="font-display text-lg font-semibold leading-tight">{s.name}</h4>
                        <ArrowUpRight className="h-5 w-5 shrink-0 text-fog transition group-hover:rotate-45 group-hover:text-forge" />
                      </div>
                      <p className="mt-3 flex-1 text-sm leading-relaxed text-fog">{s.description}</p>
                      <div className="mt-6 flex items-center justify-between border-t border-white/[.06] pt-4">
                        <span className="flex items-center gap-1.5 text-sm text-fog">
                          <Clock className="h-4 w-4" /> {s.durationMin >= 60 ? `${+(s.durationMin / 60).toFixed(1)} ч` : `${s.durationMin} мин`}
                        </span>
                        <span className="font-display font-semibold">{formatPrice(s.price)}</span>
                      </div>
                    </Link>
                  </Reveal>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* masters */}
      <section id="masters" className="relative border-y border-white/[.06] bg-coal py-24 md:py-32">
        <div className="mx-auto max-w-7xl px-5">
          <Reveal>
            <span className="eyebrow"><span className="h-px w-8 bg-forge" /> Команда</span>
            <h2 className="mt-5 font-display text-4xl font-bold uppercase leading-none md:text-6xl">
              Мастера, <span className="text-molten">а не менеджеры</span>
            </h2>
          </Reveal>
          <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {masters.map((m, i) => (
              <Reveal key={m.id} delay={i * 0.07}>
                <div className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-white/[.07] bg-ink p-6">
                  <div className="absolute inset-x-0 top-0 h-1 opacity-70" style={{ background: m.color }} />
                  <Avatar name={m.name} color={m.color} size={64} />
                  <h3 className="mt-5 font-display text-lg font-semibold">{m.name}</h3>
                  <div className="mt-1 text-sm" style={{ color: m.color }}>{m.specialty}</div>
                  <p className="mt-4 flex-1 text-sm leading-relaxed text-fog">{m.bio}</p>
                  <div className="mt-5 flex flex-wrap gap-1.5">
                    {m.services.slice(0, 3).map((s) => (
                      <span key={s.serviceId} className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-fog">{s.service.name}</span>
                    ))}
                  </div>
                  <Link href={`/book?master=${m.id}`} className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-bone transition hover:text-forge">
                    Записаться к мастеру <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                  </Link>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* projects */}
      <section id="projects" className="mx-auto max-w-7xl px-5 py-24 md:py-32">
        <Reveal>
          <span className="eyebrow"><span className="h-px w-8 bg-forge" /> Проекты</span>
          <h2 className="mt-5 font-display text-4xl font-bold uppercase leading-none md:text-6xl">
            Цифры <span className="text-molten">с диностенда</span>
          </h2>
        </Reveal>
        <div className="mt-14 grid gap-4 lg:grid-cols-3">
          {PROJECTS.map((p, i) => (
            <Reveal key={p.car} delay={i * 0.08}>
              <div className="card relative h-full overflow-hidden p-7">
                <div className="grid-bg absolute inset-0 opacity-60" />
                <div className="relative">
                  <span className="rounded-full bg-forge/15 px-3 py-1 text-xs font-semibold text-forge">{p.tag}</span>
                  <h3 className="mt-5 font-display text-xl font-semibold">{p.car}</h3>
                  <p className="mt-2 text-sm text-fog">{p.work}</p>
                  <div className="mt-8 flex items-end gap-3">
                    <span className="font-display text-5xl font-bold text-molten">{p.to}</span>
                    <span className="mb-1.5 text-fog">л.с.</span>
                    <span className="mb-1.5 ml-auto rounded-lg bg-emerald-400/10 px-2 py-1 text-sm font-semibold text-emerald-400">+{Math.round((p.to / p.from - 1) * 100)}%</span>
                  </div>
                  <div className="mt-5 space-y-2">
                    {[["Сток", p.from, "bg-white/25"], ["После", p.to, "bg-gradient-to-r from-forge to-ember"]].map(([l, v, c]) => (
                      <div key={l as string} className="flex items-center gap-3 text-xs text-fog">
                        <span className="w-12">{l}</span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/[.06]">
                          <div className={`h-full rounded-full ${c}`} style={{ width: `${((v as number) / 800) * 100}%` }} />
                        </div>
                        <span className="w-10 text-right text-bone">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* process */}
      <section id="process" className="border-y border-white/[.06] bg-coal py-24 md:py-32">
        <div className="mx-auto max-w-7xl px-5">
          <Reveal>
            <span className="eyebrow"><span className="h-px w-8 bg-forge" /> Как мы работаем</span>
            <h2 className="mt-5 font-display text-4xl font-bold uppercase leading-none md:text-6xl">
              Четыре передачи <span className="text-molten">до результата</span>
            </h2>
          </Reveal>
          <div className="mt-14 grid gap-px overflow-hidden rounded-3xl border border-white/[.07] bg-white/[.07] md:grid-cols-4">
            {PROCESS.map(([n, t, d], i) => (
              <Reveal key={n} delay={i * 0.08} className="bg-ink p-7">
                <div className="font-display text-5xl font-bold text-white/10">{n}</div>
                <h3 className="mt-6 font-display text-lg font-semibold">{t}</h3>
                <p className="mt-3 text-sm leading-relaxed text-fog">{d}</p>
              </Reveal>
            ))}
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {[[ShieldCheck, "Гарантия 12 месяцев"], [Gauge, "Замер до и после"], [Wrench, "Оригинальные запчасти"]].map(([Icon, t], i) => {
              const I = Icon as typeof ShieldCheck;
              return (
                <div key={i} className="flex items-center gap-3 rounded-2xl border border-white/[.07] px-5 py-4 text-sm">
                  <I className="h-5 w-5 text-forge" /> {t as string}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* reviews */}
      <section className="mx-auto max-w-7xl px-5 py-24 md:py-32">
        <Reveal>
          <span className="eyebrow"><span className="h-px w-8 bg-forge" /> Отзывы</span>
        </Reveal>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {REVIEWS.map(([who, text], i) => (
            <Reveal key={who} delay={i * 0.08}>
              <figure className="card h-full p-7">
                <div className="text-ember">★★★★★</div>
                <blockquote className="mt-4 leading-relaxed">«{text}»</blockquote>
                <figcaption className="mt-5 text-sm text-fog">{who}</figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-5 pb-24">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2rem] border border-forge/30 bg-gradient-to-br from-forge/25 via-coal to-coal p-10 md:p-16">
            <div className="absolute -right-24 -bottom-24 h-80 w-80 rounded-full bg-forge/30 blur-[100px]" />
            <div className="relative flex flex-col items-start justify-between gap-8 md:flex-row md:items-end">
              <div>
                <h2 className="max-w-2xl font-display text-3xl font-bold uppercase leading-tight md:text-5xl">Готов завести проект?</h2>
                <p className="mt-4 max-w-lg text-fog">Выберите день, время и мастера — запись займёт меньше минуты. Или напишите нашему боту в Telegram.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href="/book" className="btn-forge text-base">Записаться <ArrowRight className="h-4 w-4" /></Link>
                <a href={`https://t.me/${BUSINESS.telegramBot}`} target="_blank" className="btn-ghost text-base"><Send className="h-4 w-4" /> Telegram-бот</a>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      <footer id="contacts" className="border-t border-white/[.06] bg-coal">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 md:grid-cols-4">
          <div className="md:col-span-2">
            <Logo />
            <p className="mt-4 max-w-sm text-sm text-fog">{BUSINESS.tagline}. {BUSINESS.warranty}.</p>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex gap-2 text-fog"><MapPin className="h-4 w-4 shrink-0 text-forge" /> {BUSINESS.address}</div>
            <div className="flex gap-2 text-fog"><Clock className="h-4 w-4 shrink-0 text-forge" /> {BUSINESS.hours}</div>
          </div>
          <div className="space-y-3 text-sm">
            <a href={`tel:${BUSINESS.phone.replace(/\s/g, "")}`} className="flex gap-2 text-fog hover:text-bone"><Phone className="h-4 w-4 text-forge" /> {BUSINESS.phone}</a>
            <a href={`https://t.me/${BUSINESS.telegramBot}`} className="flex gap-2 text-fog hover:text-bone"><Send className="h-4 w-4 text-forge" /> @{BUSINESS.telegramBot}</a>
          </div>
        </div>
        <div className="border-t border-white/[.06] py-5 text-center text-xs text-fog/60">© {new Date().getFullYear()} {BUSINESS.name}</div>
      </footer>

      <ChatWidget />
    </main>
  );
}
