import crypto from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { verifyInitData } from "./webapp";

const TOKEN = "123456:TEST-TOKEN";
const NOW = new Date("2026-09-14T05:00:00Z");
const nowSec = NOW.getTime() / 1000;

function sign(fields: Record<string, string>, token = TOKEN) {
  const dataCheck = Object.entries(fields)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");
  const secret = crypto.createHmac("sha256", "WebAppData").update(token).digest();
  return crypto.createHmac("sha256", secret).update(dataCheck).digest("hex");
}

const fields = (o: Record<string, string> = {}) => ({
  auth_date: String(nowSec - 60),
  query_id: "AAE1",
  user: JSON.stringify({ id: 42, first_name: "Aziz" }),
  ...o,
});

const initData = (f: Record<string, string>, hash = sign(f)) => new URLSearchParams({ ...f, hash }).toString();

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  // токен читается при каждом вызове, не при импорте
  vi.stubEnv("TELEGRAM_BOT_TOKEN", TOKEN);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("verifyInitData", () => {
  it("returns the user id for valid signed data", () => {
    expect(verifyInitData(initData(fields()))).toBe("42");
  });

  it("rejects tampered fields", () => {
    const f = fields();
    const tampered = new URLSearchParams({ ...f, user: JSON.stringify({ id: 1 }), hash: sign(f) }).toString();
    expect(verifyInitData(tampered)).toBeNull();
  });

  it("rejects a wrong or missing hash", () => {
    const f = fields();
    expect(verifyInitData(initData(f, sign(f, "999:OTHER")))).toBeNull();
    expect(verifyInitData(initData(f, "abc"))).toBeNull();
    expect(verifyInitData(new URLSearchParams(f).toString())).toBeNull();
  });

  it("accepts auth_date up to exactly 24h old, rejects older or missing", () => {
    expect(verifyInitData(initData(fields({ auth_date: String(nowSec - 86_400) })))).toBe("42");
    expect(verifyInitData(initData(fields({ auth_date: String(nowSec - 86_401) })))).toBeNull();
    const { auth_date: _drop, ...noDate } = fields();
    expect(verifyInitData(initData(noDate))).toBeNull();
  });

  it("accepts auth_date in the future", () => {
    // нет проверки на дату из будущего — фиксируем текущее поведение
    expect(verifyInitData(initData(fields({ auth_date: String(nowSec + 3600) })))).toBe("42");
  });

  it("returns null without token or initData", () => {
    expect(verifyInitData(null)).toBeNull();
    expect(verifyInitData(undefined)).toBeNull();
    expect(verifyInitData("")).toBeNull();
    const data = initData(fields());
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "");
    expect(verifyInitData(data)).toBeNull();
  });

  it("returns null when user is missing, has no id or is not JSON", () => {
    const { user: _drop, ...noUser } = fields();
    expect(verifyInitData(initData(noUser))).toBeNull();
    expect(verifyInitData(initData(fields({ user: JSON.stringify({ first_name: "x" }) })))).toBeNull();
    expect(verifyInitData(initData(fields({ user: "not json" })))).toBeNull();
  });
});
