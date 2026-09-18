"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useI18n } from "@/i18n/client";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t, locale } = useI18n();
  useEffect(() => console.error(error), [error]);
  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden px-5">
      <div className="grid-bg absolute inset-0" />
      <div className="relative text-center">
        <h1 className="font-display text-3xl font-bold uppercase">{t.pages.errorTitle}</h1>
        <p className="mx-auto mt-3 max-w-md text-fog">{t.pages.errorText}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button onClick={reset} className="btn-forge">
            {t.pages.retry}
          </button>
          <Link href={`/${locale}`} className="btn-ghost">
            {t.pages.home}
          </Link>
        </div>
      </div>
    </main>
  );
}
