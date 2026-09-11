import { PageTitle } from "@/components/admin/AdminNav";
import { ServicesManager } from "@/components/admin/ServicesManager";
import { getDict } from "@/i18n";
import { getRequestLocale } from "@/i18n/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  const t = getDict(await getRequestLocale());
  const services = await prisma.service.findMany({
    orderBy: [{ active: "desc" }, { category: "asc" }, { price: "asc" }],
    include: { _count: { select: { bookings: true, masters: true } } },
  });
  return (
    <div>
      <PageTitle title={t.admin.services.title} sub={t.admin.services.sub} />
      <ServicesManager services={services.map(({ _count, ...s }) => ({ ...s, bookings: _count.bookings, masters: _count.masters }))} />
    </div>
  );
}
