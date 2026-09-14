import { handle, ok } from "@/lib/api";
import { resolveLocale } from "@/i18n/server";
import { prisma } from "@/lib/db";
import { localizeMaster, localizeService } from "@/lib/i18n-data";

export const dynamic = "force-dynamic";

export const GET = handle(async (req: Request) => {
  const locale = await resolveLocale(new URL(req.url).searchParams.get("locale"));
  const [services, masters] = await Promise.all([
    prisma.service.findMany({ where: { active: true }, include: { masters: true }, orderBy: [{ category: "asc" }, { price: "asc" }] }),
    prisma.master.findMany({ where: { active: true }, include: { services: true }, orderBy: { createdAt: "asc" } }),
  ]);
  const activeMasterIds = new Set(masters.map((m) => m.id));
  return ok({
    services: services
      .map(({ masters: ms, ...s }) => ({
        ...localizeService(s, locale),
        masterIds: ms.map((m) => m.masterId).filter((id) => activeMasterIds.has(id)),
      }))
      .filter((s) => s.masterIds.length),
    masters: masters.map(({ services: ss, ...m }) => ({ ...localizeMaster(m, locale), serviceIds: ss.map((s) => s.serviceId) })),
  });
});
