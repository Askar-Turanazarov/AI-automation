import clsx from "clsx";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export function Logo({ className, compact, href = "/" }: { className?: string; compact?: boolean; href?: string }) {
  return (
    <Link href={href} className={clsx("group inline-flex items-center gap-2.5", className)}>
      <svg viewBox="0 0 32 32" className="h-8 w-8 shrink-0" aria-hidden>
        <defs>
          <linearGradient id="lg" x1="0" x2="1" y1="1" y2="0">
            <stop offset="0" stopColor="#ff5a1f" />
            <stop offset="1" stopColor="#ffb020" />
          </linearGradient>
        </defs>
        <path d="M16 2 28 9v14l-12 7L4 23V9z" fill="none" stroke="url(#lg)" strokeWidth="2" />
        <path d="M17.5 7 11 17.5h4.5L14 25l7-11h-4.8z" fill="url(#lg)" className="origin-center transition group-hover:scale-110" />
      </svg>
      {!compact && (
        <span className="font-display text-[13px] font-semibold uppercase leading-none tracking-[.22em] whitespace-nowrap">
          Octane<span className="text-forge">·</span>Forge
        </span>
      )}
    </Link>
  );
}

export function Avatar({ name, color, size = 48, className }: { name: string; color: string; size?: number; className?: string }) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");
  return (
    <div
      className={clsx("relative grid shrink-0 place-items-center rounded-2xl font-display font-semibold text-black", className)}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.34,
        background: `linear-gradient(135deg, ${color}, color-mix(in oklab, ${color} 55%, #fff))`,
        boxShadow: `0 8px 30px -10px ${color}`,
      }}
    >
      {initials}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span className={clsx("inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent", className)} />
  );
}

/** Классы чипа-переключателя; подходят и для <button>, и для <Link>. Отступы — через className */
export const chipClass = (active: boolean, className?: string) =>
  clsx(
    "rounded-full border text-sm transition",
    active ? "border-forge bg-forge/15" : "border-white/10 text-fog hover:text-bone",
    className,
  );

/** Круглая кнопка с иконкой; label обязателен — это aria-label */
export function IconButton({ label, className, type = "button", ...props }: ComponentProps<"button"> & { label: string }) {
  return (
    <button
      type={type}
      aria-label={label}
      className={clsx("rounded-full p-2 text-fog hover:bg-white/5 hover:text-bone", className)}
      {...props}
    />
  );
}

/** Полоска прогресса: value в процентах (не больше 100). Высота — через className */
export function ProgressBar({
  value,
  color,
  className,
  barClassName,
  children,
}: {
  value: number;
  color?: string;
  className?: string;
  barClassName?: string;
  children?: ReactNode;
}) {
  return (
    <div className={clsx("relative overflow-hidden rounded-full bg-white/[.06]", className)}>
      <div className={clsx("h-full rounded-full", barClassName)} style={{ width: `${Math.min(100, value)}%`, background: color }} />
      {children}
    </div>
  );
}
