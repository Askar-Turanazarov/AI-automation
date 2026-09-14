import clsx from "clsx";
import { PageTitle } from "@/components/admin/AdminNav";
import { PublishToggle } from "@/components/admin/PublishToggle";
import { getDict, tpl } from "@/i18n";
import { formatDate } from "@/i18n/dates";
import { getRequestLocale } from "@/i18n/server";
import { prisma } from "@/lib/db";
import { localizedName, localizeService } from "@/lib/i18n-data";

export const dynamic = "force-dynamic";

export default async function ReviewsPage() {
  const locale = await getRequestLocale();
  const tr = getDict(locale).admin.reviews;
  const reviews = await prisma.review.findMany({
    include: { booking: { include: { service: true, master: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  const avg = reviews.length ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;

  return (
    <div>
      <PageTitle title={tr.title} sub={reviews.length ? tpl(tr.sub, { avg: avg.toFixed(1), n: reviews.length }) : undefined} />
      {!reviews.length && <div className="card p-10 text-center text-fog">{tr.empty}</div>}
      <div className="grid gap-4 lg:grid-cols-2">
        {reviews.map((r) => (
          <article key={r.id} className={clsx("card p-5", r.rating <= 3 && "border-red-400/25")}>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className={clsx("text-lg tracking-wider", r.rating <= 3 ? "text-red-300" : "text-ember")} aria-label={`${r.rating}/5`}>
                  {"★".repeat(r.rating)}
                  <span className="text-white/15">{"★".repeat(5 - r.rating)}</span>
                </div>
                <div className="mt-1 text-sm font-semibold">
                  {r.booking.clientName} ·{" "}
                  <a href={`tel:${r.booking.phone.replace(/\s/g, "")}`} className="text-fog hover:text-bone">
                    {r.booking.phone}
                  </a>
                </div>
                <div className="text-xs text-fog">
                  {localizeService(r.booking.service, locale).name} · {localizedName(r.booking.master, locale)} ·{" "}
                  {formatDate(r.booking.date, locale)}
                </div>
              </div>
              <PublishToggle id={r.id} published={r.published} disabled={!r.text} />
            </div>
            <p className={clsx("mt-4 text-sm leading-relaxed", !r.text && "text-fog italic")}>{r.text || tr.noText}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
