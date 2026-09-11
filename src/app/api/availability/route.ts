import { getAvailableDays } from "@/lib/booking/availability";
import { fail, handle, ok } from "@/lib/api";
import { todayISO } from "@/lib/time";

export const dynamic = "force-dynamic";

export const GET = handle(async (req: Request) => {
  const q = new URL(req.url).searchParams;
  const serviceId = q.get("serviceId");
  if (!serviceId) return fail("serviceId required");
  const days = await getAvailableDays({
    serviceId,
    masterId: q.get("masterId"),
    from: q.get("from") || todayISO(),
    days: Number(q.get("days")) || 42,
  });
  return days ? ok({ today: todayISO(), days }) : fail("Услуга не найдена", 404);
});
