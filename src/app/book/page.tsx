import Script from "next/script";
import { BookingWizard } from "@/components/booking/BookingWizard";
import { Logo } from "@/components/ui";

export const metadata = { title: "Запись — Octane Forge" };

export default async function BookPage({ searchParams }: { searchParams: Promise<{ service?: string; master?: string }> }) {
  const { service, master } = await searchParams;
  return (
    <main className="relative min-h-screen">
      <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[500px] bg-[radial-gradient(ellipse_at_top,rgba(255,90,31,.18),transparent_65%)]" />
      <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-5 sm:py-8">
        <div className="mb-8 flex items-center justify-between">
          <Logo />
        </div>
        <h1 className="mb-8 font-display text-3xl font-bold uppercase leading-none sm:text-5xl">
          Онлайн-<span className="text-molten">запись</span>
        </h1>
        <BookingWizard initialService={service} initialMaster={master} />
      </div>
    </main>
  );
}
