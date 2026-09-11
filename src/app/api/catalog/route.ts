import { prisma } from "@/lib/db";
import { handle, ok } from "@/lib/api";

export const dynamic = "force-dynamic";

export const GET = handle(async () => {
  const [services, masters] = await Promise.all([
    prisma.service.findMany({ where: { active: true }, include: { masters: true }, orderBy: [{ category: "asc" }, { price: "asc" }] }),
    prisma.master.findMany({ where: { active: true }, include: { services: true }, orderBy: { createdAt: "asc" } }),
  ]);
  const activeMasterIds = new Set(masters.map((m) => m.id));
  return ok({
    services: services
      .map(({ masters: ms, ...s }) => ({ ...s, masterIds: ms.map((m) => m.masterId).filter((id) => activeMasterIds.has(id)) }))
      .filter((s) => s.masterIds.length),
    masters: masters.map(({ services: ss, ...m }) => ({ ...m, serviceIds: ss.map((s) => s.serviceId) })),
  });
});
