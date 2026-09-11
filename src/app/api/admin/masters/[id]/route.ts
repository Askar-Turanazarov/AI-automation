import { fail, handle, ok } from "@/lib/api";
import { prisma } from "@/lib/db";
import { masterInput } from "@/lib/schemas";

type P = { params: Promise<{ id: string }> };

export const PATCH = handle(async (req: Request, { params }: P) => {
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

export const DELETE = handle(async (_req: Request, { params }: P) => {
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

export const POST = handle(async (req: Request, { params }: P) => {
  // выходной день: { date, reason } — добавить; { date, remove: true } — удалить
  const { id } = await params;
  const { date, reason = "", remove } = await req.json();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? "")) return fail("Некорректная дата");
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
