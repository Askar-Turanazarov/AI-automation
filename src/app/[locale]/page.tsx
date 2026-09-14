import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChatWidget } from "@/components/landing/ChatWidget";
import { Hero } from "@/components/landing/Hero";
import { CtaSection, SiteFooter } from "@/components/landing/sections/Contacts";
import { MastersSection } from "@/components/landing/sections/Masters";
import { ProcessSection, ReviewsSection } from "@/components/landing/sections/Process";
import { ProjectsSection } from "@/components/landing/sections/Projects";
import { ServicesSection } from "@/components/landing/sections/Services";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { getDict } from "@/i18n";
import { isLocale, locales } from "@/i18n/config";
import { prisma } from "@/lib/db";
import { localizeMaster, localizeService } from "@/lib/i18n-data";
import { publicReviews } from "@/lib/reviews";

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

export default async function Home({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const [servicesRaw, mastersRaw, reviews] = await Promise.all([
    prisma.service.findMany({ where: { active: true }, orderBy: [{ category: "asc" }, { price: "asc" }] }),
    prisma.master.findMany({
      where: { active: true },
      orderBy: { createdAt: "asc" },
      include: { services: { include: { service: true } } },
    }),
    publicReviews(),
  ]);
  const services = servicesRaw.map((s) => localizeService(s, locale));
  const masters = mastersRaw.map((m) => ({
    ...localizeMaster(m, locale),
    serviceNames: m.services.map((s) => localizeService(s.service, locale).name),
  }));

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

      <ServicesSection locale={locale} services={services} />
      <MastersSection locale={locale} masters={masters} />
      <ProjectsSection locale={locale} />
      <ProcessSection locale={locale} />
      <ReviewsSection locale={locale} reviews={reviews} />
      <CtaSection locale={locale} />
      <SiteFooter locale={locale} />

      <ChatWidget />
    </main>
  );
}
