import { ArrowRight, Clock, MapPin, Phone, Send } from "lucide-react";
import Link from "next/link";
import { Reveal } from "@/components/landing/Reveal";
import { Logo } from "@/components/ui";
import { getDict } from "@/i18n";
import type { Locale } from "@/i18n/config";
import { businessInfo } from "@/lib/business";

const AUTHOR = "Askar Turanazarov";

export function CtaSection({ locale }: { locale: Locale }) {
  const t = getDict(locale);
  const biz = businessInfo(locale);
  return (
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
              <Link href={`/${locale}/book`} className="btn-forge text-base">
                {t.common.book} <ArrowRight className="h-4 w-4" />
              </Link>
              <a href={`https://t.me/${biz.telegramBot}`} target="_blank" className="btn-ghost text-base">
                <Send className="h-4 w-4" /> {t.cta.bot}
              </a>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

export function SiteFooter({ locale }: { locale: Locale }) {
  const t = getDict(locale);
  const biz = businessInfo(locale);
  return (
    <footer id="contacts" className="border-t border-white/[.06] bg-coal">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo href={`/${locale}`} />
          <div className="mt-1.5 pl-0.5 font-display text-[7.5px] uppercase leading-none tracking-[.2em] whitespace-nowrap text-fog/50">
            <span className="text-forge/80">by</span> {AUTHOR}
          </div>
          <p className="mt-4 max-w-sm text-sm text-fog">
            {biz.tagline} · {biz.city}. {biz.warranty}.
          </p>
        </div>
        <div className="space-y-3 text-sm">
          <div className="flex gap-2 text-fog">
            <MapPin className="h-4 w-4 shrink-0 text-forge" /> {biz.address}
          </div>
          <div className="flex gap-2 text-fog">
            <Clock className="h-4 w-4 shrink-0 text-forge" /> {biz.hours}
          </div>
        </div>
        <div className="space-y-3 text-sm">
          <a href={`tel:${biz.phone.replace(/\s/g, "")}`} className="flex gap-2 text-fog hover:text-bone">
            <Phone className="h-4 w-4 text-forge" /> {biz.phone}
          </a>
          <a href={`https://t.me/${biz.telegramBot}`} className="flex gap-2 text-fog hover:text-bone">
            <Send className="h-4 w-4 text-forge" /> @{biz.telegramBot}
          </a>
        </div>
      </div>
      <div className="border-t border-white/[.06] py-5 text-center text-xs text-fog/60">
        © {new Date().getFullYear()} {biz.name} · {AUTHOR} · {t.footer.rights}
      </div>
    </footer>
  );
}
