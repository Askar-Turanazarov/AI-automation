import { getDict } from "@/i18n";
import { getRequestLocale } from "@/i18n/server";
import { fail, handle, ok, type IdParams } from "@/lib/api";
import { prisma } from "@/lib/db";
import { masterInput, timeOffInput } from "@/lib/schemas";

export const PATCH = handle(async (req: Request, { params }: IdParams) => {
  const { id } = await params;
  const d = masterInput.partial().parse(await req.json());
  const { serviceIds, schedules, ...fields } = d;
  const m = await prisma.$transaction(async (tx) => {
    if (serviceIds) {
      await tx.masterService.deleteMany({ where: { masterId: id } });
      await tx.masterService.createMany({ data: serviceIds.map((serviceId) => ({ masterId: id, serviceId })) });
    }
    if (schedules) {
      await tx.workSchedule.deleteMany({ where: { masterId: id } });
      await tx.workSchedule.createMany({ data: schedules.map((s) => ({ ...s, masterId: id })) });
    }
    return tx.master.update({ where: { id }, data: fields });
  });
  return ok(m);
});

export const DELETE = handle(async (_req: Request, { params }: IdParams) => {
  const { id } = await params;
  const hasBookings = await prisma.booking.count({ where: { masterId: id } });
  if (hasBookings) {
    // сохраняем историю записей — мастер просто скрывается
    await prisma.master.update({ where: { id }, data: { active: false } });
    return ok({ archived: true });
  }
  await prisma.master.delete({ where: { id } }).catch(() => null);
  return ok({ deleted: true });
});

export const POST = handle(async (req: Request, { params }: IdParams) => {
  // выходной день: { date, reason } — добавить; { date, remove: true } — удалить
  const { id } = await params;
  const parsed = timeOffInput.safeParse(await req.json());
  if (!parsed.success) return fail(getDict(await getRequestLocale()).errors.invalid, 400, "invalid");
  const { date, reason, remove } = parsed.data;
  if (remove) {
    await prisma.timeOff.deleteMany({ where: { masterId: id, date } });
    return ok({ removed: true });
  }
  const t = await prisma.timeOff.upsert({
    where: { masterId_date: { masterId: id, date } },
    create: { masterId: id, date, reason },
    update: { reason },
  });
  return ok(t);
});
