import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { BookingError } from "@/lib/booking/create";

export const ok = (data: unknown, init?: ResponseInit) => NextResponse.json(data, init);
export const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

/** Единая обработка ошибок в route handlers */
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A) => {
    try {
      return await fn(...args);
    } catch (e) {
      if (e instanceof ZodError) return fail(e.issues[0]?.message ?? "Некорректные данные", 422);
      if (e instanceof BookingError) return fail(e.message, 409);
      console.error(e);
      return fail("Внутренняя ошибка сервера", 500);
    }
  };
}

const hits = new Map<string, number[]>();
/** Простой in-memory rate limit: limit запросов за windowMs */
export function rateLimited(key: string, limit = 20, windowMs = 60_000) {
  const now = Date.now();
  const arr = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  arr.push(now);
  hits.set(key, arr);
  return arr.length > limit;
}

export const clientIp = (req: Request) => req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
