"use client";

import clsx from "clsx";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Logo } from "@/components/ui";
import { useI18n } from "@/i18n/client";

export function SiteHeader() {
  const { t, locale } = useI18n();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const nav = [
    ["#services", t.nav.services],
    ["#masters", t.nav.masters],
    ["#projects", t.nav.projects],
    ["#process", t.nav.process],
    ["#contacts", t.nav.contacts],
  ];

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 20);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  return (
    <header className={clsx("fixed inset-x-0 top-0 z-40 transition-all", scrolled || open ? "border-b border-white/[.06] bg-ink/80 backdrop-blur-xl" : "")}>
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4">
        <Logo href={`/${locale}`} />
        <nav className="hidden items-center gap-7 lg:flex">
          {nav.map(([href, label]) => (
            <a key={href} href={href} className="text-sm text-fog transition hover:text-bone">
              {label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <LanguageSwitcher className="hidden sm:flex" />
          <Link href={`/${locale}/book`} className="btn-forge !px-5 !py-2.5 text-sm">
            {t.common.book}
          </Link>
          <button onClick={() => setOpen(!open)} className="rounded-full p-2 lg:hidden" aria-label={t.common.menu}>
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>
      {open && (
        <nav className="flex flex-col gap-1 px-5 pb-5 lg:hidden">
          {nav.map(([href, label]) => (
            <a key={href} href={href} onClick={() => setOpen(false)} className="rounded-xl px-3 py-3 text-lg hover:bg-white/5">
              {label}
            </a>
          ))}
          <LanguageSwitcher className="mt-3 self-start sm:hidden" />
        </nav>
      )}
    </header>
  );
}
