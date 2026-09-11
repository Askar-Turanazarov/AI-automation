import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getDict } from "@/i18n";
import { getRequestLocale } from "@/i18n/server";
import { BookingError } from "@/lib/booking/create";

export const ok = (data: unknown, init?: ResponseInit) => NextResponse.json(data, init);
export const fail = (error: string, status = 400, code?: string) => NextResponse.json({ error, code }, { status });

/** Единая обработка ошибок в route handlers; тексты ошибок — на языке пользователя */
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A) => {
    try {
      return await fn(...args);
    } catch (e) {
      const t = getDict(await getRequestLocale());
      if (e instanceof ZodError) return fail(t.errors.invalid, 422, "invalid");
      if (e instanceof BookingError) return fail(t.errors[e.code], 409, e.code);
      console.error(e);
      return fail(t.errors.server, 500, "server");
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
