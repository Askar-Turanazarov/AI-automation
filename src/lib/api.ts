import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getDict } from "@/i18n";
import { getRequestLocale } from "@/i18n/server";
import { BookingError } from "@/lib/booking/errors";
import { prisma } from "@/lib/db";

export const ok = (data: unknown, init?: ResponseInit) => NextResponse.json(data, init);
export const fail = (error: string, status = 400, code?: string) => NextResponse.json({ error, code }, { status });

/** Второй аргумент route handler для маршрутов вида [id] */
export type IdParams = { params: Promise<{ id: string }> };

/** Единая обработка ошибок в route handlers; тексты ошибок — на языке пользователя */
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A) => {
    try {
      return await fn(...args);
    } catch (e) {
      const t = getDict(await getRequestLocale());
      if (e instanceof ZodError) return fail(t.errors.invalid, 422, "invalid");
      if (e instanceof BookingError) return fail(t.errors[e.code], 409, e.code);
      // битый JSON в теле запроса (req.json())
      if (e instanceof SyntaxError) return fail(t.errors.invalid, 400, "bad_json");
      // update/delete по несуществующему id
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") return fail(t.errors.not_found, 404, "not_found");
      console.error(e);
      return fail(t.errors.server, 500, "server");
    }
  };
}

/**
 * Лимит запросов: limit за windowMs (фиксированное окно). Хранится в БД — на serverless у каждого инстанса своя память.
 * Если БД недоступна, запрос пропускаем: сама операция всё равно упадёт с понятной ошибкой.
 */
export async function rateLimited(key: string, limit = 20, windowMs = 60_000) {
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowMs);
  try {
    const row = await prisma.rateLimit.upsert({ where: { key }, create: { key, count: 1, resetAt }, update: { count: { increment: 1 } } });
    if (row.resetAt <= now) {
      await prisma.rateLimit.update({ where: { key }, data: { count: 1, resetAt } });
      // изредка чистим протухшие окна, чтобы таблица не росла
      if (Math.random() < 0.02) await prisma.rateLimit.deleteMany({ where: { resetAt: { lt: now } } });
      return false;
    }
    return row.count > limit;
  } catch (e) {
    console.error("[rate-limit]", e);
    return false;
  }
}

export const clientIp = (req: Request) => req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
