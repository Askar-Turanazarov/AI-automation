import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Script from "next/script";
import { BookingWizard } from "@/components/booking/BookingWizard";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Logo } from "@/components/ui";
import { getDict } from "@/i18n";
import { isLocale, locales } from "@/i18n/config";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ service?: string; master?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return {
    title: getDict(locale).meta.bookTitle,
    alternates: { languages: Object.fromEntries(locales.map((l) => [l, `/${l}/book`])) },
  };
}

export default async function BookPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDict(locale);
  const { service, master } = await searchParams;
  return (
    <main className="relative min-h-screen">
      <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[500px] bg-[radial-gradient(ellipse_at_top,rgba(255,90,31,.18),transparent_65%)]" />
      <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-5 sm:py-8">
        <div className="mb-8 flex items-center justify-between gap-4">
          <Logo href={`/${locale}`} />
          <LanguageSwitcher />
        </div>
        <h1 className="mb-8 font-display text-3xl font-bold uppercase leading-none sm:text-5xl">
          {t.booking.titleA}
          <span className="text-molten">{t.booking.titleB}</span>
        </h1>
        <BookingWizard initialService={service} initialMaster={master} />
      </div>
    </main>
  );
}
