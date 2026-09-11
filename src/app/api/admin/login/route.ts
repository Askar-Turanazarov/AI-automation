import { NextResponse } from "next/server";
import { getDict } from "@/i18n";
import { getRequestLocale } from "@/i18n/server";
import { clientIp, fail, rateLimited } from "@/lib/api";
import { ADMIN_COOKIE, createAdminToken } from "@/lib/auth";

export async function POST(req: Request) {
  const t = getDict(await getRequestLocale());
  if (rateLimited(`login:${clientIp(req)}`, 5)) return fail(t.errors.rate, 429, "rate");
  const { password } = await req.json().catch(() => ({}));
  if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) return fail(t.errors.wrong_password, 401, "wrong_password");
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
