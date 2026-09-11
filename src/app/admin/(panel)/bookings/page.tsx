import clsx from "clsx";
import Link from "next/link";
import { PageTitle } from "@/components/admin/AdminNav";
import { StatusSelect } from "@/components/admin/StatusSelect";
import { Avatar } from "@/components/ui";
import { prisma } from "@/lib/db";
import { addDays, formatDateRu, formatPrice, minToHHMM, todayISO } from "@/lib/time";

export const dynamic = "force-dynamic";

const SOURCE = { web: "🌐 Сайт", bot: "🤖 Бот", ai: "✨ ИИ" } as Record<string, string>;

export default async function BookingsPage({ searchParams }: { searchParams: Promise<{ date?: string; master?: string; range?: string }> }) {
  const sp = await searchParams;
  const today = todayISO();
  const range = sp.range ?? "upcoming";
  const where =
    sp.date
      ? { date: sp.date }
      : range === "past"
        ? { date: { gte: addDays(today, -30), lt: today } }
        : { date: { gte: today, lte: addDays(today, 30) } };

  const [bookings, masters] = await Promise.all([
    prisma.booking.findMany({
      where: { ...where, ...(sp.master ? { masterId: sp.master } : {}) },
      include: { master: true, service: true },
      orderBy: [{ date: range === "past" ? "desc" : "asc" }, { startMin: "asc" }],
      take: 300,
    }),
    prisma.master.findMany({ orderBy: { createdAt: "asc" } }),
  ]);

  const byDate = new Map<string, typeof bookings>();
  for (const b of bookings) byDate.set(b.date, [...(byDate.get(b.date) ?? []), b]);

  const q = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams(Object.entries({ range, master: sp.master, date: sp.date, ...patch }).filter(([, v]) => v) as [string, string][]);
    return `/admin/bookings?${p}`;
  };

  return (
    <div>
      <PageTitle title="Записи" sub={`${bookings.length} записей в выборке`} />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        {[["upcoming", "Ближайшие 30 дней"], ["past", "Прошедшие"]].map(([k, l]) => (
          <Link key={k} href={q({ range: k, date: undefined })} className={clsx("rounded-full border px-4 py-2 text-sm", range === k && !sp.date ? "border-forge bg-forge/15" : "border-white/10 text-fog hover:text-bone")}>{l}</Link>
        ))}
        <form action="/admin/bookings" className="flex items-center gap-2">
          <input type="date" name="date" defaultValue={sp.date} className="input !w-auto !py-2 text-sm" />
          {sp.master && <input type="hidden" name="master" value={sp.master} />}
          <button className="btn-ghost !py-2 text-sm">Показать день</button>
        </form>
        <div className="mx-2 h-6 w-px bg-white/10" />
        <Link href={q({ master: undefined })} className={clsx("rounded-full border px-3 py-2 text-sm", !sp.master ? "border-forge bg-forge/15" : "border-white/10 text-fog")}>Все мастера</Link>
        {masters.map((m) => (
          <Link key={m.id} href={q({ master: m.id })} className={clsx("flex items-center gap-2 rounded-full border py-1.5 pr-3 pl-1.5 text-sm", sp.master === m.id ? "border-forge bg-forge/15" : "border-white/10 text-fog hover:text-bone")}>
            <Avatar name={m.name} color={m.color} size={24} className="!rounded-full" /> {m.name.split(" ")[0]}
          </Link>
        ))}
      </div>

      {!bookings.length && <div className="card p-10 text-center text-fog">Записей нет</div>}

      <div className="space-y-8">
        {[...byDate.entries()].map(([date, list]) => (
          <section key={date}>
            <div className="mb-3 flex items-baseline gap-3">
              <h2 className={clsx("font-display font-semibold", date === today && "text-forge")}>{date === today ? "Сегодня · " : ""}{formatDateRu(date)}</h2>
              <span className="text-sm text-fog">{list.filter((b) => b.status !== "cancelled").length} записей · {formatPrice(list.filter((b) => b.status !== "cancelled").reduce((a, b) => a + b.service.price, 0))}</span>
            </div>
            <div className="card divide-y divide-white/[.05] overflow-hidden">
              {list.map((b) => (
                <div key={b.id} className={clsx("grid items-center gap-3 px-5 py-4 text-sm md:grid-cols-[110px_1.3fr_1fr_1.2fr_90px_150px]", b.status === "cancelled" && "opacity-45")}>
                  <div className="font-display font-semibold tabular-nums">{minToHHMM(b.startMin)}<span className="text-fog">–{minToHHMM(b.endMin)}</span></div>
                  <div>
                    <div className="font-semibold">{b.service.name}</div>
                    <div className="text-xs text-fog">{formatPrice(b.service.price)}</div>
                  </div>
                  <div className="flex items-center gap-2"><Avatar name={b.master.name} color={b.master.color} size={28} className="!rounded-lg" /> {b.master.name}</div>
                  <div>
                    <div>{b.clientName} · <a href={`tel:${b.phone}`} className="text-fog hover:text-bone">{b.phone}</a></div>
                    <div className="text-xs text-fog">{b.car}{b.comment && ` · ${b.comment}`}</div>
                  </div>
                  <div className="text-xs text-fog">{SOURCE[b.source] ?? b.source}</div>
                  <StatusSelect id={b.id} status={b.status} />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
