"use client";

import clsx from "clsx";
import { CalendarCheck, ExternalLink, LayoutDashboard, LogOut, Sparkles, Users, Wrench } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Logo } from "@/components/ui";
import { useI18n } from "@/i18n/client";

export function AdminNav() {
  const { t } = useI18n();
  const n = t.admin.nav;
  const path = usePathname();
  const router = useRouter();
  const nav = [
    ["/admin", n.dashboard, LayoutDashboard],
    ["/admin/bookings", n.bookings, CalendarCheck],
    ["/admin/masters", n.masters, Users],
    ["/admin/services", n.services, Wrench],
    ["/admin/ai", n.ai, Sparkles],
  ] as const;

  const logout = async () => {
    await fetch("/api/admin/login", { method: "DELETE" });
    router.replace("/admin/login");
  };

  return (
    <aside className="sticky top-0 z-30 flex shrink-0 flex-row items-center gap-1 overflow-x-auto border-b border-white/[.06] bg-coal/90 px-3 py-2 backdrop-blur-xl lg:h-screen lg:w-60 lg:flex-col lg:items-stretch lg:border-r lg:border-b-0 lg:px-4 lg:py-6">
      <div className="hidden px-2 pb-6 lg:block">
        <Logo href="/admin" />
      </div>
      {nav.map(([href, label, Icon]) => {
        const active = href === "/admin" ? path === href : path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={clsx(
              "flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
              active ? "bg-forge/12 font-semibold text-bone ring-1 ring-forge/30" : "text-fog hover:bg-white/5 hover:text-bone",
            )}
          >
            <Icon className={clsx("h-4 w-4", active && "text-forge")} />
            <span className="hidden sm:inline">{label}</span>
          </Link>
        );
      })}
      <div className="flex-1" />
      <LanguageSwitcher className="shrink-0 lg:mx-2 lg:mb-3 lg:self-start" />
      <Link href="/" target="_blank" className="flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-fog hover:text-bone">
        <ExternalLink className="h-4 w-4" /> <span className="hidden sm:inline">{n.site}</span>
      </Link>
      <button onClick={logout} className="flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-fog hover:text-bone">
        <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">{n.logout}</span>
      </button>
    </aside>
  );
}

export function PageTitle({ title, sub, children }: { title: string; sub?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl font-bold uppercase sm:text-3xl">{title}</h1>
        {sub && <p className="mt-1.5 text-sm text-fog">{sub}</p>}
      </div>
      {children}
    </div>
  );
}
