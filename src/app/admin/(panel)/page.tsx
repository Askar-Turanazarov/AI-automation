import { PageTitle } from "@/components/admin/AdminNav";
import { Dashboard } from "@/components/admin/Dashboard";
import { getDict, tpl } from "@/i18n";
import { formatDate } from "@/i18n/dates";
import { getRequestLocale } from "@/i18n/server";
import { localizedName, localizeService } from "@/lib/i18n-data";
import { getDashboardStats } from "@/lib/stats";
import { minToHHMM } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const locale = await getRequestLocale();
  const t = getDict(locale);
  const s = await getDashboardStats();
  return (
    <div>
      <PageTitle title={t.admin.dashboard.title} sub={tpl(t.admin.dashboard.today, { date: formatDate(s.today, locale) })} />
      <Dashboard
        data={{
          ...s,
          workloadWeek: s.workloadWeek.map((w) => ({ ...w, name: localizedName(w, locale) })),
          upcoming: s.upcoming.map((b) => ({
            id: b.id,
            when: `${formatDate(b.date, locale)} · ${minToHHMM(b.startMin)}`,
            service: localizeService(b.service, locale).name,
            master: localizedName(b.master, locale),
            color: b.master.color,
            client: b.clientName,
            car: b.car,
            source: b.source,
          })),
        }}
      />
    </div>
  );
}
