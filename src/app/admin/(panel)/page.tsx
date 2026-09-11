import { PageTitle } from "@/components/admin/AdminNav";
import { Dashboard } from "@/components/admin/Dashboard";
import { getDashboardStats } from "@/lib/stats";
import { formatDateRu, minToHHMM } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const s = await getDashboardStats();
  return (
    <div>
      <PageTitle title="Дашборд" sub={`Сегодня ${formatDateRu(s.today)}`} />
      <Dashboard
        data={{
          ...s,
          upcoming: s.upcoming.map((b) => ({
            id: b.id,
            when: `${formatDateRu(b.date)} · ${minToHHMM(b.startMin)}`,
            service: b.service.name,
            master: b.master.name,
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
