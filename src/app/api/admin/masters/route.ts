import { handle, ok } from "@/lib/api";
import { prisma } from "@/lib/db";
import { masterInput } from "@/lib/schemas";

export const POST = handle(async (req: Request) => {
  const d = masterInput.parse(await req.json());
  const m = await prisma.master.create({
    data: {
      name: d.name,
      specialty: d.specialty,
      bio: d.bio,
      color: d.color,
      active: d.active,
      services: { create: d.serviceIds.map((serviceId) => ({ serviceId })) },
      schedules: { create: d.schedules },
    },
  });
  return ok(m);
});
