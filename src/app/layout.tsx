import type { Metadata, Viewport } from "next";
import { Manrope, Unbounded } from "next/font/google";
import "./globals.css";

const unbounded = Unbounded({ subsets: ["latin", "cyrillic"], variable: "--font-unbounded", display: "swap" });
const manrope = Manrope({ subsets: ["latin", "cyrillic"], variable: "--font-manrope", display: "swap" });

export const metadata: Metadata = {
  title: "Octane Forge — тюнинг-ателье",
  description: "Чип-тюнинг, выхлоп, подвеска, PPF и интерьер. Онлайн-запись к мастеру за минуту.",
};

export const viewport: Viewport = { themeColor: "#0a0a0c" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: telegram-web-app.js добавляет CSS-переменные на <html> до гидрации
    <html lang="ru" className={`${unbounded.variable} ${manrope.variable}`} suppressHydrationWarning>
      <body className="grain min-h-screen">{children}</body>
    </html>
  );
}
