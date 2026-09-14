import { getDict } from "@/i18n";
import { getRequestLocale } from "@/i18n/server";
import { getAvailableDays } from "@/lib/booking/availability";
import { fail, handle, ok } from "@/lib/api";
import { isoDate } from "@/lib/schemas";
import { todayISO } from "@/lib/time";

export const dynamic = "force-dynamic";

export const GET = handle(async (req: Request) => {
  const q = new URL(req.url).searchParams;
  const serviceId = q.get("serviceId");
  if (!serviceId) return fail("serviceId required");
  const from = q.get("from") || todayISO();
  if (!isoDate.safeParse(from).success) return fail("from must be a valid YYYY-MM-DD date", 400, "invalid");
  const days = await getAvailableDays({
    serviceId,
    masterId: q.get("masterId"),
    from,
    days: Number(q.get("days")) || 42,
  });
  return days
    ? ok({ today: todayISO(), days })
    : fail(getDict(await getRequestLocale()).errors.service_not_found, 404, "service_not_found");
});
