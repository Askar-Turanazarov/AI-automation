import { getDaySlots } from "@/lib/booking/availability";
import { fail, handle, ok } from "@/lib/api";

export const dynamic = "force-dynamic";

export const GET = handle(async (req: Request) => {
  const q = new URL(req.url).searchParams;
  const serviceId = q.get("serviceId");
  const date = q.get("date");
  if (!serviceId || !date) return fail("serviceId and date required");
  const day = await getDaySlots({ serviceId, date, masterId: q.get("masterId") });
  return day ? ok(day) : fail("Услуга не найдена", 404);
});
