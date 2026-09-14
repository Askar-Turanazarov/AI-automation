import { SignJWT } from "jose";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAdminToken, verifyAdminToken } from "./auth";

const sign = (payload: Record<string, unknown>, secret: string, exp: number) =>
  new SignJWT(payload).setProtectedHeader({ alg: "HS256" }).setExpirationTime(exp).sign(new TextEncoder().encode(secret));

const nowSec = () => Math.floor(Date.now() / 1000);

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("AUTH_SECRET", "test-secret");
});
afterEach(() => vi.unstubAllEnvs());

describe("admin JWT", () => {
  it("round-trips a freshly issued token", async () => {
    expect(await verifyAdminToken(await createAdminToken())).toBe(true);
  });

  it("rejects missing, malformed and foreign-signed tokens", async () => {
    expect(await verifyAdminToken()).toBe(false);
    expect(await verifyAdminToken("not-a-jwt")).toBe(false);
    expect(await verifyAdminToken(await sign({ role: "admin" }, "other-secret", nowSec() + 3600))).toBe(false);
  });

  it("rejects an expired token and a non-admin role", async () => {
    expect(await verifyAdminToken(await sign({ role: "admin" }, "test-secret", nowSec() - 60))).toBe(false);
    expect(await verifyAdminToken(await sign({ role: "user" }, "test-secret", nowSec() + 3600))).toBe(false);
  });

  it("uses the dev fallback secret outside production", async () => {
    vi.stubEnv("AUTH_SECRET", "");
    expect(await verifyAdminToken(await createAdminToken())).toBe(true);
  });

  it("throws in production when AUTH_SECRET is missing", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AUTH_SECRET", "");
    await expect(createAdminToken()).rejects.toThrow("AUTH_SECRET");
    await expect(verifyAdminToken("any")).rejects.toThrow("AUTH_SECRET");
  });
});
