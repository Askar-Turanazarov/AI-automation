import { NextResponse, type NextRequest } from "next/server";
import { detectLocale, isLocale, LOCALE_COOKIE, type Locale } from "@/i18n/config";
import { ADMIN_COOKIE, verifyAdminToken } from "@/lib/auth";

const YEAR = 365 * 86400;

function next(req: NextRequest, locale: Locale) {
  const headers = new Headers(req.headers);
  headers.set("x-locale", locale);
  return NextResponse.next({ request: { headers } });
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const saved = req.cookies.get(LOCALE_COOKIE)?.value;
  const detected = detectLocale(saved, req.headers.get("accept-language"));

  // админка: язык из cookie, доступ по токену
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    const open = pathname.startsWith("/admin/login") || pathname === "/api/admin/login";
    if (!open && !(await verifyAdminToken(req.cookies.get(ADMIN_COOKIE)?.value))) {
      if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }
    return next(req, detected);
  }

  // публичный сайт: /ru, /uz, /en
  const segment = pathname.split("/")[1];
  if (isLocale(segment)) {
    const res = next(req, segment);
    if (saved !== segment) res.cookies.set(LOCALE_COOKIE, segment, { path: "/", maxAge: YEAR, sameSite: "lax" });
    return res;
  }
  return NextResponse.redirect(new URL(`/${detected}${pathname === "/" ? "" : pathname}${search}`, req.url));
}

export const config = { matcher: ["/((?!api|_next|.*\\..*).*)", "/api/admin/:path*"] };
