import type { Metadata, Viewport } from "next";
import { Manrope, Unbounded } from "next/font/google";
import { I18nProvider } from "@/i18n/client";
import { getDict } from "@/i18n";
import { getRequestLocale } from "@/i18n/server";
import "./globals.css";

const unbounded = Unbounded({ subsets: ["latin", "cyrillic"], variable: "--font-unbounded", display: "swap" });
const manrope = Manrope({ subsets: ["latin", "cyrillic"], variable: "--font-manrope", display: "swap" });

export async function generateMetadata(): Promise<Metadata> {
  const t = getDict(await getRequestLocale());
  return { title: t.meta.title, description: t.meta.description };
}

export const viewport: Viewport = { themeColor: "#0a0a0c" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getRequestLocale();
  return (
    // suppressHydrationWarning: telegram-web-app.js добавляет CSS-переменные на <html> до гидрации
    <html lang={locale} className={`${unbounded.variable} ${manrope.variable}`} suppressHydrationWarning>
      <body className="grain min-h-screen">
        <I18nProvider locale={locale}>{children}</I18nProvider>
      </body>
    </html>
  );
}
