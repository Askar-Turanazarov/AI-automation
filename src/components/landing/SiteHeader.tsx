"use client";

import clsx from "clsx";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo } from "@/components/ui";

const NAV = [
  ["#services", "Услуги"],
  ["#masters", "Мастера"],
  ["#projects", "Проекты"],
  ["#process", "Процесс"],
  ["#contacts", "Контакты"],
];

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 20);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  return (
    <header className={clsx("fixed inset-x-0 top-0 z-40 transition-all", scrolled || open ? "border-b border-white/[.06] bg-ink/80 backdrop-blur-xl" : "")}>
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-5 py-4">
        <Logo />
        <nav className="hidden items-center gap-8 md:flex">
          {NAV.map(([href, label]) => (
            <a key={href} href={href} className="text-sm text-fog transition hover:text-bone">
              {label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/book" className="btn-forge !px-5 !py-2.5 text-sm">
            Записаться
          </Link>
          <button onClick={() => setOpen(!open)} className="rounded-full p-2 md:hidden" aria-label="Меню">
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>
      {open && (
        <nav className="flex flex-col gap-1 px-5 pb-5 md:hidden">
          {NAV.map(([href, label]) => (
            <a key={href} href={href} onClick={() => setOpen(false)} className="rounded-xl px-3 py-3 text-lg hover:bg-white/5">
              {label}
            </a>
          ))}
        </nav>
      )}
    </header>
  );
}
