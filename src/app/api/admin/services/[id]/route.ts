import { handle, ok } from "@/lib/api";
import { prisma } from "@/lib/db";
import { serviceInput } from "@/lib/schemas";

type P = { params: Promise<{ id: string }> };

export const PATCH = handle(async (req: Request, { params }: P) => {
  const { id } = await params;
  return ok(await prisma.service.update({ where: { id }, data: serviceInput.partial().parse(await req.json()) }));
});

export const DELETE = handle(async (_req: Request, { params }: P) => {
  const { id } = await params;
  if (await prisma.booking.count({ where: { serviceId: id } })) {
    await prisma.service.update({ where: { id }, data: { active: false } });
    return ok({ archived: true });
  }
  await prisma.service.delete({ where: { id } }).catch(() => null);
  return ok({ deleted: true });
});
