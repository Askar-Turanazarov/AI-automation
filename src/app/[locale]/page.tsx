import { ArrowRight, ArrowUpRight, Clock, Gauge, MapPin, Phone, Send, ShieldCheck, Wrench } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChatWidget } from "@/components/landing/ChatWidget";
import { Hero } from "@/components/landing/Hero";
import { Reveal } from "@/components/landing/Reveal";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { Price } from "@/components/Price";
import { Avatar, Logo } from "@/components/ui";
import { getDict } from "@/i18n";
import { isLocale, locales } from "@/i18n/config";
import { businessInfo } from "@/lib/business";
import { prisma } from "@/lib/db";
import { localizeMaster, localizeService } from "@/lib/i18n-data";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getDict(locale);
  return {
    title: t.meta.title,
    description: t.meta.description,
    alternates: { languages: Object.fromEntries(locales.map((l) => [l, `/${l}`])) },
  };
}

const BRANDS = ["Chevrolet", "BYD", "Toyota", "Lexus", "BMW M", "Mercedes-AMG", "Kia", "Hyundai N", "Li Auto", "Porsche"];
const PERK_ICONS = [ShieldCheck, Gauge, Wrench];

export default async function Home({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDict(locale);
  const biz = businessInfo(locale);

  const [servicesRaw, mastersRaw] = await Promise.all([
    prisma.service.findMany({ where: { active: true }, orderBy: [{ category: "asc" }, { price: "asc" }] }),
    prisma.master.findMany({ where: { active: true }, orderBy: { createdAt: "asc" }, include: { services: { include: { service: true } } } }),
  ]);
  const services = servicesRaw.map((s) => localizeService(s, locale));
  const masters = mastersRaw.map((m) => ({ ...localizeMaster(m, locale), serviceNames: m.services.map((s) => localizeService(s.service, locale).name) }));
  const categories = [...new Set(services.map((s) => s.category))];
  const hours = (m: number) => (m >= 60 ? `${+(m / 60).toFixed(1)} ${t.common.h}` : `${m} ${t.common.min}`);

  return (
    <main className="overflow-x-clip">
      <SiteHeader />
      <Hero />

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
          <span className="eyebrow"><span className="h-px w-8 bg-forge" /> {t.services.eyebrow}</span>
          <div className="mt-5 flex flex-wrap items-end justify-between gap-6">
            <h2 className="max-w-2xl font-display text-4xl font-bold uppercase leading-none md:text-6xl">
              {t.services.titleA} <span className="text-molten">{t.services.titleB}</span>
            </h2>
            <p className="max-w-md text-fog">{t.services.lead}</p>
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
                      href={`/${locale}/book?service=${s.id}`}
                      className="card group relative flex h-full flex-col overflow-hidden p-6 transition duration-300 hover:-translate-y-1 hover:border-forge/40"
                    >
                      <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-forge/0 blur-3xl transition duration-500 group-hover:bg-forge/25" />
                      <div className="flex items-start justify-between gap-4">
                        <h4 className="font-display text-lg font-semibold leading-tight">{s.name}</h4>
                        <ArrowUpRight className="h-5 w-5 shrink-0 text-fog transition group-hover:rotate-45 group-hover:text-forge" />
                      </div>
                      <p className="mt-3 flex-1 text-sm leading-relaxed text-fog">{s.description}</p>
                      <div className="mt-6 flex items-end justify-between gap-3 border-t border-white/[.06] pt-4">
                        <span className="flex items-center gap-1.5 pb-0.5 text-sm text-fog">
                          <Clock className="h-4 w-4" /> {hours(s.durationMin)}
                        </span>
                        <Price amount={s.price} locale={locale} align="right" mainClassName="font-display font-semibold" />
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
            <span className="eyebrow"><span className="h-px w-8 bg-forge" /> {t.masters.eyebrow}</span>
            <h2 className="mt-5 font-display text-4xl font-bold uppercase leading-none md:text-6xl">
              {t.masters.titleA} <span className="text-molten">{t.masters.titleB}</span>
            </h2>
          </Reveal>
          <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {masters.map((m, i) => (
              <Reveal key={m.id} delay={i * 0.07}>
                <div className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-white/[.07] bg-ink p-6">
                  <div className="absolute inset-x-0 top-0 h-1 opacity-70" style={{ background: m.color }} />
                  <Avatar name={m.name} color={m.color} size={60} />
                  <h3 className="mt-5 font-display text-lg font-semibold leading-tight">{m.name}</h3>
                  <div className="mt-1 text-sm" style={{ color: m.color }}>{m.specialty}</div>
                  <p className="mt-4 flex-1 text-sm leading-relaxed text-fog">{m.bio}</p>
                  <div className="mt-5 flex flex-wrap gap-1.5">
                    {m.serviceNames.slice(0, 3).map((n) => (
                      <span key={n} className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-fog">{n}</span>
                    ))}
                  </div>
                  <Link href={`/${locale}/book?master=${m.id}`} className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-bone transition hover:text-forge">
                    {t.masters.bookWith} <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
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
          <span className="eyebrow"><span className="h-px w-8 bg-forge" /> {t.projects.eyebrow}</span>
          <h2 className="mt-5 font-display text-4xl font-bold uppercase leading-none md:text-6xl">
            {t.projects.titleA} <span className="text-molten">{t.projects.titleB}</span>
          </h2>
        </Reveal>
        <div className="mt-14 grid gap-4 lg:grid-cols-3">
          {t.projects.items.map((p, i) => (
            <Reveal key={p.car} delay={i * 0.08}>
              <div className="card relative h-full overflow-hidden p-7">
                <div className="grid-bg absolute inset-0 opacity-60" />
                <div className="relative">
                  <span className="rounded-full bg-forge/15 px-3 py-1 text-xs font-semibold text-forge">{p.tag}</span>
                  <h3 className="mt-5 font-display text-xl font-semibold">{p.car}</h3>
                  <p className="mt-2 text-sm text-fog">{p.work}</p>
                  <div className="mt-8 flex items-end gap-3">
                    <span className="font-display text-5xl font-bold text-molten">{p.to}</span>
                    <span className="mb-1.5 text-fog">{t.projects.hp}</span>
                    <span className="mb-1.5 ml-auto rounded-lg bg-emerald-400/10 px-2 py-1 text-sm font-semibold text-emerald-400">+{Math.round((p.to / p.from - 1) * 100)}%</span>
                  </div>
                  <div className="mt-5 space-y-2">
                    {([[t.projects.stock, p.from, "bg-white/25"], [t.projects.after, p.to, "bg-gradient-to-r from-forge to-ember"]] as const).map(([l, v, c]) => (
                      <div key={l} className="flex items-center gap-3 text-xs text-fog">
                        <span className="w-14">{l}</span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/[.06]">
                          <div className={`h-full rounded-full ${c}`} style={{ width: `${(v / 800) * 100}%` }} />
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
            <span className="eyebrow"><span className="h-px w-8 bg-forge" /> {t.process.eyebrow}</span>
            <h2 className="mt-5 font-display text-4xl font-bold uppercase leading-none md:text-6xl">
              {t.process.titleA} <span className="text-molten">{t.process.titleB}</span>
            </h2>
          </Reveal>
          <div className="mt-14 grid gap-px overflow-hidden rounded-3xl border border-white/[.07] bg-white/[.07] md:grid-cols-4">
            {t.process.steps.map((s, i) => (
              <Reveal key={s.title} delay={i * 0.08} className="bg-ink p-7">
                <div className="font-display text-5xl font-bold text-white/10">{String(i + 1).padStart(2, "0")}</div>
                <h3 className="mt-6 font-display text-lg font-semibold">{s.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-fog">{s.text}</p>
              </Reveal>
            ))}
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {t.process.perks.map((perk, i) => {
              const Icon = PERK_ICONS[i];
              return (
                <div key={perk} className="flex items-center gap-3 rounded-2xl border border-white/[.07] px-5 py-4 text-sm">
                  <Icon className="h-5 w-5 text-forge" /> {perk}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* reviews */}
      <section className="mx-auto max-w-7xl px-5 py-24 md:py-32">
        <Reveal>
          <span className="eyebrow"><span className="h-px w-8 bg-forge" /> {t.reviews.eyebrow}</span>
        </Reveal>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {t.reviews.items.map((r, i) => (
            <Reveal key={r.who} delay={i * 0.08}>
              <figure className="card h-full p-7">
                <div className="text-ember">★★★★★</div>
                <blockquote className="mt-4 leading-relaxed">«{r.text}»</blockquote>
                <figcaption className="mt-5 text-sm text-fog">{r.who}</figcaption>
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
                <h2 className="max-w-2xl font-display text-3xl font-bold uppercase leading-tight md:text-5xl">{t.cta.title}</h2>
                <p className="mt-4 max-w-lg text-fog">{t.cta.lead}</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href={`/${locale}/book`} className="btn-forge text-base">{t.common.book} <ArrowRight className="h-4 w-4" /></Link>
                <a href={`https://t.me/${biz.telegramBot}`} target="_blank" className="btn-ghost text-base"><Send className="h-4 w-4" /> {t.cta.bot}</a>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      <footer id="contacts" className="border-t border-white/[.06] bg-coal">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 md:grid-cols-4">
          <div className="md:col-span-2">
            <Logo href={`/${locale}`} />
            <p className="mt-4 max-w-sm text-sm text-fog">{biz.tagline} · {biz.city}. {biz.warranty}.</p>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex gap-2 text-fog"><MapPin className="h-4 w-4 shrink-0 text-forge" /> {biz.address}</div>
            <div className="flex gap-2 text-fog"><Clock className="h-4 w-4 shrink-0 text-forge" /> {biz.hours}</div>
          </div>
          <div className="space-y-3 text-sm">
            <a href={`tel:${biz.phone.replace(/\s/g, "")}`} className="flex gap-2 text-fog hover:text-bone"><Phone className="h-4 w-4 text-forge" /> {biz.phone}</a>
            <a href={`https://t.me/${biz.telegramBot}`} className="flex gap-2 text-fog hover:text-bone"><Send className="h-4 w-4 text-forge" /> @{biz.telegramBot}</a>
          </div>
        </div>
        <div className="border-t border-white/[.06] py-5 text-center text-xs text-fog/60">© {new Date().getFullYear()} {biz.name} · {t.footer.rights}</div>
      </footer>

      <ChatWidget />
    </main>
  );
}
