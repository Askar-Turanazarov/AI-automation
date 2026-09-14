import { Gauge, ShieldCheck, Wrench } from "lucide-react";
import { Reveal } from "@/components/landing/Reveal";
import { getDict, tpl } from "@/i18n";
import type { Locale } from "@/i18n/config";
import type { PublicReviews } from "@/lib/reviews";
import { Eyebrow, SectionHeading } from "./SectionHeading";

const PERK_ICONS = [ShieldCheck, Gauge, Wrench];

export function ProcessSection({ locale }: { locale: Locale }) {
  const t = getDict(locale);
  return (
    <section id="process" className="border-y border-white/[.06] bg-coal py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-5">
        <SectionHeading text={t.process} />
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
  );
}

export function ReviewsSection({ locale, reviews }: { locale: Locale; reviews: PublicReviews }) {
  const t = getDict(locale);
  // настоящие отзывы из бота; пока их меньше трёх — дополняем примерами из словаря
  const items = [...reviews.items, ...t.reviews.items.map((r) => ({ ...r, rating: 5 }))].slice(0, Math.max(3, reviews.items.length));
  return (
    <section className="mx-auto max-w-7xl px-5 py-24 md:py-32">
      <Reveal>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Eyebrow>{t.reviews.eyebrow}</Eyebrow>
          {reviews.count > 0 && reviews.avg != null && (
            <span className="text-sm text-fog">
              <span className="font-semibold text-ember">★ {reviews.avg.toFixed(1)}</span> · {tpl(t.reviews.basedOn, { n: reviews.count })}
            </span>
          )}
        </div>
      </Reveal>
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {items.map((r, i) => (
          <Reveal key={`${r.who}-${i}`} delay={i * 0.08}>
            <figure className="card card-hover h-full p-7">
              <div className="text-ember" aria-label={`${r.rating}/5`}>
                {"★".repeat(r.rating)}
                <span className="text-white/15">{"★".repeat(5 - r.rating)}</span>
              </div>
              <blockquote className="mt-4 leading-relaxed">«{r.text}»</blockquote>
              <figcaption className="mt-5 text-sm text-fog">{r.who}</figcaption>
            </figure>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
