import { fail, handle, ok } from "@/lib/api";
import { sendReminders } from "@/lib/booking/reminders";

/** Vercel Cron (vercel.json) раз в день: напоминания о завтрашних записях. Vercel присылает Bearer CRON_SECRET */
export const GET = handle(async (req: Request) => {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return fail("Unauthorized", 401, "unauthorized");
  return ok({ sent: await sendReminders() });
});
