import { PageTitle } from "@/components/admin/AdminNav";
import { MastersManager } from "@/components/admin/MastersManager";
import { getDict } from "@/i18n";
import { getRequestLocale } from "@/i18n/server";
import { prisma } from "@/lib/db";
import { localizeService } from "@/lib/i18n-data";
import { getWorkload } from "@/lib/stats";
import { addDays, todayISO } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function MastersPage() {
  const locale = await getRequestLocale();
  const t = getDict(locale);
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
      <PageTitle title={t.admin.masters.title} sub={t.admin.masters.sub} />
      <MastersManager
        today={today}
        services={services.map((s) => {
          const l = localizeService(s, locale);
          return { id: s.id, name: l.name, category: l.category };
        })}
        masters={masters.map((m) => ({
          id: m.id,
          name: m.name,
          nameLatin: m.nameLatin,
          specialty: m.specialty,
          specialtyUz: m.specialtyUz,
          specialtyEn: m.specialtyEn,
          bio: m.bio,
          bioUz: m.bioUz,
          bioEn: m.bioEn,
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
