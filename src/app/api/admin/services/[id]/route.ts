import { revalidateTag } from "next/cache";
import { handle, ok, type IdParams } from "@/lib/api";
import { CACHE_TAGS } from "@/lib/cache";
import { prisma } from "@/lib/db";
import { serviceInput } from "@/lib/schemas";

export const PATCH = handle(async (req: Request, { params }: IdParams) => {
  const { id } = await params;
  const s = await prisma.service.update({ where: { id }, data: serviceInput.partial().parse(await req.json()) });
  revalidateTag(CACHE_TAGS.catalog);
  return ok(s);
});

export const DELETE = handle(async (_req: Request, { params }: IdParams) => {
  const { id } = await params;
  if (await prisma.booking.count({ where: { serviceId: id } })) {
    await prisma.service.update({ where: { id }, data: { active: false } });
    revalidateTag(CACHE_TAGS.catalog);
    return ok({ archived: true });
  }
  await prisma.service.delete({ where: { id } }).catch(() => null);
  revalidateTag(CACHE_TAGS.catalog);
  return ok({ deleted: true });
});
