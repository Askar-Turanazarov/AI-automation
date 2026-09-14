import { z } from "zod";
import { handle, ok, type IdParams } from "@/lib/api";
import { prisma } from "@/lib/db";

/** Модерация: показывать отзыв на сайте или нет */
export const PATCH = handle(async (req: Request, { params }: IdParams) => {
  const { id } = await params;
  const { published } = z.object({ published: z.boolean() }).parse(await req.json());
  return ok(await prisma.review.update({ where: { id }, data: { published } }));
});
