import { ArrowUpRight, Clock } from "lucide-react";
import Link from "next/link";
import { Reveal } from "@/components/landing/Reveal";
import { Price } from "@/components/Price";
import { getDict } from "@/i18n";
import type { Locale } from "@/i18n/config";
import { formatDuration } from "@/i18n/dates";
import { SectionHeading } from "./SectionHeading";

type Service = { id: string; name: string; category: string; description: string; durationMin: number; price: number };

export function ServicesSection({ locale, services }: { locale: Locale; services: Service[] }) {
  const t = getDict(locale);
  const categories = [...new Set(services.map((s) => s.category))];
  return (
    <section id="services" className="mx-auto max-w-7xl px-5 py-24 md:py-32">
      <SectionHeading text={t.services} />
      <div className="mt-14 space-y-12">
        {categories.map((cat) => (
          <div key={cat}>
            <div className="mb-5 flex items-center gap-4">
              <h3 className="font-display text-sm uppercase tracking-[.2em] text-fog">{cat}</h3>
              <div className="h-px flex-1 bg-white/[.06]" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {services
                .filter((s) => s.category === cat)
                .map((s, i) => (
                  <Reveal key={s.id} delay={i * 0.05}>
                    <Link href={`/${locale}/book?service=${s.id}`} className="card card-hover group flex h-full flex-col p-6">
                      <div className="flex items-start justify-between gap-4">
                        <h4 className="font-display text-lg font-semibold leading-tight">{s.name}</h4>
                        <ArrowUpRight className="h-5 w-5 shrink-0 text-fog transition group-hover:rotate-45 group-hover:text-forge" />
                      </div>
                      <p className="mt-3 flex-1 text-sm leading-relaxed text-fog">{s.description}</p>
                      <div className="mt-6 flex items-end justify-between gap-3 border-t border-white/[.06] pt-4">
                        <span className="flex items-center gap-1.5 pb-0.5 text-sm text-fog">
                          <Clock className="h-4 w-4" /> {formatDuration(s.durationMin, t.common)}
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
  );
}
