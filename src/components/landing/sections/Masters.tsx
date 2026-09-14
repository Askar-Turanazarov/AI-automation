import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Reveal } from "@/components/landing/Reveal";
import { Avatar } from "@/components/ui";
import { getDict } from "@/i18n";
import type { Locale } from "@/i18n/config";
import { SectionHeading } from "./SectionHeading";

type Master = { id: string; name: string; specialty: string; bio: string; color: string; serviceNames: string[] };

export function MastersSection({ locale, masters }: { locale: Locale; masters: Master[] }) {
  const t = getDict(locale);
  return (
    <section id="masters" className="relative border-y border-white/[.06] bg-coal py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-5">
        <SectionHeading text={t.masters} />
        <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {masters.map((m, i) => (
            <Reveal key={m.id} delay={i * 0.07}>
              <div className="card card-hover group flex h-full flex-col bg-ink p-6">
                <div className="absolute inset-x-0 top-0 h-1 opacity-70" style={{ background: m.color }} />
                <Avatar name={m.name} color={m.color} size={60} />
                <h3 className="mt-5 font-display text-lg font-semibold leading-tight">{m.name}</h3>
                <div className="mt-1 text-sm" style={{ color: m.color }}>
                  {m.specialty}
                </div>
                <p className="mt-4 flex-1 text-sm leading-relaxed text-fog">{m.bio}</p>
                <div className="mt-5 flex flex-wrap gap-1.5">
                  {m.serviceNames.slice(0, 3).map((n) => (
                    <span key={n} className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-fog">
                      {n}
                    </span>
                  ))}
                </div>
                <Link
                  href={`/${locale}/book?master=${m.id}`}
                  className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-bone transition hover:text-forge"
                >
                  {t.masters.bookWith} <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </Link>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
