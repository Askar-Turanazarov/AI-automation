import { revalidateTag } from "next/cache";
import { handle, ok } from "@/lib/api";
import { CACHE_TAGS } from "@/lib/cache";
import { prisma } from "@/lib/db";
import { masterInput } from "@/lib/schemas";

export const POST = handle(async (req: Request) => {
  const { serviceIds, schedules, ...fields } = masterInput.parse(await req.json());
  const m = await prisma.master.create({
    data: {
      ...fields,
      services: { create: serviceIds.map((serviceId) => ({ serviceId })) },
      schedules: { create: schedules },
    },
  });
  revalidateTag(CACHE_TAGS.catalog);
  return ok(m);
});
