import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Script from "next/script";
import { MiniApp } from "@/components/miniapp/MiniApp";
import { getDict } from "@/i18n";
import { isLocale } from "@/i18n/config";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ tab?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return isLocale(locale) ? { title: getDict(locale).app.title, robots: { index: false } } : {};
}

/** Telegram Mini App: запись и «Мои записи» — открывается кнопкой меню бота */
export default async function MiniAppPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { tab } = await searchParams;
  return (
    <>
      <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
      <MiniApp initialTab={tab === "my" ? "my" : "book"} />
    </>
  );
}
