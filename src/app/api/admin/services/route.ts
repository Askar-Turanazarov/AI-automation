import { handle, ok } from "@/lib/api";
import { prisma } from "@/lib/db";
import { serviceInput } from "@/lib/schemas";

export const POST = handle(async (req: Request) => ok(await prisma.service.create({ data: serviceInput.parse(await req.json()) })));
