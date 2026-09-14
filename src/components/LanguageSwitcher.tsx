"use client";

import clsx from "clsx";
import { usePathname } from "next/navigation";
import { useI18n } from "@/i18n/client";
import { isLocale, LANGUAGE_NAMES, LOCALE_COOKIE, locales, type Locale } from "@/i18n/config";

export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale } = useI18n();
  const pathname = usePathname();

  function change(next: Locale) {
    if (next === locale) return;
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    const parts = pathname.split("/");
    // полная перезагрузка — чтобы <html lang> и все серверные тексты обновились
    if (isLocale(parts[1])) {
      parts[1] = next;
      window.location.assign(parts.join("/") + window.location.search);
    } else {
      window.location.reload();
    }
  }

  return (
    <div
      role="group"
      aria-label="Language"
      className={clsx("flex shrink-0 rounded-full border border-white/10 bg-white/[.02] p-0.5", className)}
    >
      {locales.map((l) => (
        <button
          key={l}
          onClick={() => change(l)}
          aria-pressed={l === locale}
          title={LANGUAGE_NAMES[l]}
          lang={l}
          className={clsx(
            "rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider transition",
            l === locale ? "bg-white/12 text-bone" : "text-fog hover:text-bone",
          )}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
