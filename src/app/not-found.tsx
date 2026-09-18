import Link from "next/link";
import { Logo } from "@/components/ui";
import { getDict } from "@/i18n";
import { getRequestLocale } from "@/i18n/server";

export default async function NotFound() {
  const locale = await getRequestLocale();
  const t = getDict(locale).pages;
  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden px-5">
      <div className="grid-bg absolute inset-0" />
      <div className="relative text-center">
        <Logo href={`/${locale}`} className="justify-center" />
        <div className="mt-10 font-display text-[clamp(5rem,20vw,11rem)] leading-none font-bold text-molten">404</div>
        <h1 className="mt-4 font-display text-2xl font-bold uppercase">{t.notFoundTitle}</h1>
        <p className="mx-auto mt-3 max-w-md text-fog">{t.notFoundText}</p>
        <Link href={`/${locale}`} className="btn-forge mt-8">
          {t.home}
        </Link>
      </div>
    </main>
  );
}
