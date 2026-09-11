import { NextResponse } from "next/server";
import { clientIp, fail, rateLimited } from "@/lib/api";
import { ADMIN_COOKIE, createAdminToken } from "@/lib/auth";

export async function POST(req: Request) {
  if (rateLimited(`login:${clientIp(req)}`, 5)) return fail("Слишком много попыток", 429);
  const { password } = await req.json().catch(() => ({}));
  if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) return fail("Неверный пароль", 401);
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
