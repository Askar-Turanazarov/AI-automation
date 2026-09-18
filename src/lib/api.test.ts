import { Prisma } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import ru from "@/i18n/dictionaries/ru";

vi.mock("@/i18n/server", () => ({ getRequestLocale: () => Promise.resolve("ru") }));
// БД лимитов — в памяти, с той же семантикой upsert/update/deleteMany
const rows = vi.hoisted(() => new Map<string, { key: string; count: number; resetAt: Date }>());
vi.mock("@/lib/db", () => ({
  prisma: {
    rateLimit: {
      upsert: async ({ where, create }: { where: { key: string }; create: { key: string; count: number; resetAt: Date } }) => {
        const row = rows.get(where.key);
        if (!row) rows.set(where.key, { ...create });
        else row.count++;
        return { ...rows.get(where.key)! };
      },
      update: async ({ where, data }: { where: { key: string }; data: { count: number; resetAt: Date } }) =>
        rows.set(where.key, { key: where.key, ...data }),
      deleteMany: async () => ({ count: 0 }),
    },
  },
}));

import { clientIp, handle, rateLimited } from "./api";
import { BookingError } from "./booking/errors";

const run = async (thrown: unknown) => {
  const res = await handle(async () => {
    throw thrown;
  })();
  return { status: res.status, body: await res.json() };
};

describe("handle", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("passes successful responses through", async () => {
    const res = await handle(async () => Response.json({ ok: true }))();
    expect(res.status).toBe(200);
  });

  it("maps ZodError to 422", async () => {
    const err = z.object({ a: z.string() }).safeParse({}).error;
    expect(await run(err)).toEqual({ status: 422, body: { error: ru.errors.invalid, code: "invalid" } });
  });

  it("maps BookingError to 409 with its code", async () => {
    expect(await run(new BookingError("slot_taken"))).toEqual({ status: 409, body: { error: ru.errors.slot_taken, code: "slot_taken" } });
  });

  it("maps an invalid JSON body to 400", async () => {
    const res = await handle(async (req: Request) => Response.json(await req.json()))(
      new Request("http://localhost/api/x", { method: "POST", body: "{not json" }),
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: ru.errors.invalid, code: "bad_json" });
  });

  it("maps Prisma P2025 (record not found) to 404", async () => {
    const err = new Prisma.PrismaClientKnownRequestError("No record found", { code: "P2025", clientVersion: "test" });
    expect(await run(err)).toEqual({ status: 404, body: { error: ru.errors.not_found, code: "not_found" } });
  });

  it("maps other Prisma errors and unknown errors to 500 and logs them", async () => {
    const unique = new Prisma.PrismaClientKnownRequestError("Unique constraint", { code: "P2002", clientVersion: "test" });
    expect(await run(unique)).toEqual({ status: 500, body: { error: ru.errors.server, code: "server" } });
    expect(await run(new Error("boom"))).toEqual({ status: 500, body: { error: ru.errors.server, code: "server" } });
    expect(console.error).toHaveBeenCalledTimes(2);
  });
});

describe("rateLimited", () => {
  beforeEach(() => {
    rows.clear();
    vi.useFakeTimers();
    vi.setSystemTime(0);
  });
  afterEach(() => vi.useRealTimers());

  it("allows `limit` hits per window, then blocks until the window passes", async () => {
    expect(await rateLimited("t:a", 2)).toBe(false);
    expect(await rateLimited("t:a", 2)).toBe(false);
    expect(await rateLimited("t:a", 2)).toBe(true);
    expect(await rateLimited("t:b", 2)).toBe(false); // ключи независимы
    vi.advanceTimersByTime(60_000);
    expect(await rateLimited("t:a", 2)).toBe(false);
    expect(await rateLimited("t:a", 2)).toBe(false);
    expect(await rateLimited("t:a", 2)).toBe(true);
  });
});

describe("clientIp", () => {
  const req = (headers: Record<string, string> = {}) => new Request("http://localhost/", { headers });

  it("takes the first X-Forwarded-For entry", () => {
    expect(clientIp(req({ "x-forwarded-for": " 203.0.113.5 , 10.0.0.1" }))).toBe("203.0.113.5");
  });

  it("falls back to 'local'", () => {
    expect(clientIp(req())).toBe("local");
    expect(clientIp(req({ "x-forwarded-for": "" }))).toBe("local");
  });
});
