import clsx from "clsx";
import type { Locale } from "@/i18n/config";
import { formatUSD, formatUZS } from "@/lib/money";

/** Цена в сумах и под ней — мелко в долларах */
export function Price({
  amount,
  locale,
  className,
  mainClassName,
  align = "left",
}: {
  amount: number;
  locale: Locale;
  className?: string;
  mainClassName?: string;
  align?: "left" | "right" | "center";
}) {
  return (
    <span className={clsx("inline-flex flex-col leading-tight", align === "right" && "items-end text-right", align === "center" && "items-center", className)}>
      <span className={clsx("whitespace-nowrap", mainClassName)}>{formatUZS(amount, locale)}</span>
      <span className="mt-0.5 font-sans text-[11px] font-medium whitespace-nowrap text-fog tabular-nums">{formatUSD(amount)}</span>
    </span>
  );
}
