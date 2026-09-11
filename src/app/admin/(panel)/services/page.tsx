import { PageTitle } from "@/components/admin/AdminNav";
import { ServicesManager } from "@/components/admin/ServicesManager";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  const services = await prisma.service.findMany({ orderBy: [{ active: "desc" }, { category: "asc" }, { price: "asc" }], include: { _count: { select: { bookings: true, masters: true } } } });
  return (
    <div>
      <PageTitle title="Услуги" sub="Цены и длительность используются в календаре, боте и ИИ-консультанте" />
      <ServicesManager services={services.map(({ _count, ...s }) => ({ ...s, bookings: _count.bookings, masters: _count.masters }))} />
    </div>
  );
}
