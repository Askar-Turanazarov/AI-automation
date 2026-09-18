import { revalidateTag } from "next/cache";
import { handle, ok } from "@/lib/api";
import { CACHE_TAGS } from "@/lib/cache";
import { prisma } from "@/lib/db";
import { serviceInput } from "@/lib/schemas";

export const POST = handle(async (req: Request) => {
  const s = await prisma.service.create({ data: serviceInput.parse(await req.json()) });
  revalidateTag(CACHE_TAGS.catalog);
  return ok(s);
});
