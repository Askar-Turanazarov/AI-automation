import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getDict } from "@/i18n";
import { getRequestLocale } from "@/i18n/server";
import { clientIp, fail, rateLimited } from "@/lib/api";
import { ADMIN_COOKIE, createAdminToken } from "@/lib/auth";

const sha256 = (s: string) => createHash("sha256").update(s).digest();

export async function POST(req: Request) {
  const t = getDict(await getRequestLocale());
  // X-Forwarded-For можно подделать, поэтому есть и общий лимит на перебор
  if (rateLimited(`login:${clientIp(req)}`, 5) || rateLimited("login:global", 30)) return fail(t.errors.rate, 429, "rate");
  const { password } = await req.json().catch(() => ({}));
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || typeof password !== "string" || !timingSafeEqual(sha256(password), sha256(expected)))
    return fail(t.errors.wrong_password, 401, "wrong_password");
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, await createAdminToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 7 * 86400,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(ADMIN_COOKIE);
  return res;
}
