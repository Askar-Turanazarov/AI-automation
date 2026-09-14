import { Reveal } from "@/components/landing/Reveal";
import { getDict } from "@/i18n";
import type { Locale } from "@/i18n/config";
import { SectionHeading } from "./SectionHeading";

export function ProjectsSection({ locale }: { locale: Locale }) {
  const t = getDict(locale);
  return (
    <section id="projects" className="mx-auto max-w-7xl px-5 py-24 md:py-32">
      <SectionHeading text={t.projects} />
      <div className="mt-14 grid gap-4 lg:grid-cols-3">
        {t.projects.items.map((p, i) => (
          <Reveal key={p.car} delay={i * 0.08}>
            <div className="card card-hover h-full p-7">
              <div className="grid-bg absolute inset-0 opacity-60" />
              <div className="relative">
                <span className="rounded-full bg-forge/15 px-3 py-1 text-xs font-semibold text-forge">{p.tag}</span>
                <h3 className="mt-5 font-display text-xl font-semibold">{p.car}</h3>
                <p className="mt-2 text-sm text-fog">{p.work}</p>
                <div className="mt-8 flex items-end gap-3">
                  <span className="font-display text-5xl font-bold text-molten">{p.to}</span>
                  <span className="mb-1.5 text-fog">{t.projects.hp}</span>
                  <span className="mb-1.5 ml-auto rounded-lg bg-emerald-400/10 px-2 py-1 text-sm font-semibold text-emerald-400">
                    +{Math.round((p.to / p.from - 1) * 100)}%
                  </span>
                </div>
                <div className="mt-5 space-y-2">
                  {(
                    [
                      [t.projects.stock, p.from, "bg-white/25"],
                      [t.projects.after, p.to, "bg-gradient-to-r from-forge to-ember"],
                    ] as const
                  ).map(([l, v, c]) => (
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
  );
}
