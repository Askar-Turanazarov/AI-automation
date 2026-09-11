import { PageTitle } from "@/components/admin/AdminNav";
import { MastersManager } from "@/components/admin/MastersManager";
import { prisma } from "@/lib/db";
import { getWorkload } from "@/lib/stats";
import { addDays, todayISO } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function MastersPage() {
  const today = todayISO();
  const [masters, services, workload] = await Promise.all([
    prisma.master.findMany({
      orderBy: { createdAt: "asc" },
      include: { services: true, schedules: true, timeOffs: { where: { date: { gte: today } }, orderBy: { date: "asc" } } },
    }),
    prisma.service.findMany({ where: { active: true }, orderBy: [{ category: "asc" }, { name: "asc" }] }),
    getWorkload(today, addDays(today, 6)),
  ]);

  return (
    <div>
      <PageTitle title="Мастера" sub="Команда, график работы, выходные и загрузка на 7 дней" />
      <MastersManager
        today={today}
        services={services.map((s) => ({ id: s.id, name: s.name, category: s.category }))}
        masters={masters.map((m) => ({
          id: m.id,
          name: m.name,
          specialty: m.specialty,
          bio: m.bio,
          color: m.color,
          active: m.active,
          serviceIds: m.services.map((s) => s.serviceId),
          schedules: m.schedules.map(({ weekday, startMin, endMin }) => ({ weekday, startMin, endMin })),
          timeOffs: m.timeOffs.map(({ date, reason }) => ({ date, reason })),
          load: workload.find((w) => w.id === m.id) ?? null,
        }))}
      />
    </div>
  );
}
