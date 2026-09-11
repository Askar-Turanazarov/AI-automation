import { z } from "zod";
import { handle, ok } from "@/lib/api";
import { cancelBooking } from "@/lib/booking/create";
import { prisma } from "@/lib/db";

type P = { params: Promise<{ id: string }> };

export const PATCH = handle(async (req: Request, { params }: P) => {
  const { id } = await params;
  const { status } = z.object({ status: z.enum(["pending", "confirmed", "done", "cancelled"]) }).parse(await req.json());
  if (status === "cancelled") return ok(await cancelBooking(id));
  return ok(await prisma.booking.update({ where: { id }, data: { status } }));
});
