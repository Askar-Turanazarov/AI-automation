import { z } from "zod";
import { handle, ok, type IdParams } from "@/lib/api";
import { cancelBooking } from "@/lib/booking/create";
import { BOOKING_STATUSES } from "@/lib/booking/status";
import { prisma } from "@/lib/db";

export const PATCH = handle(async (req: Request, { params }: IdParams) => {
  const { id } = await params;
  const { status } = z.object({ status: z.enum(BOOKING_STATUSES) }).parse(await req.json());
  if (status === "cancelled") return ok(await cancelBooking(id));
  return ok(await prisma.booking.update({ where: { id }, data: { status } }));
});
