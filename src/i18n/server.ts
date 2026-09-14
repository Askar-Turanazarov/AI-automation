import { cookies, headers } from "next/headers";
import { detectLocale, isLocale, LOCALE_COOKIE, type Locale } from "./config";

/** Язык текущего запроса: заголовок от middleware → cookie → Accept-Language */
export async function getRequestLocale(): Promise<Locale> {
  const h = await headers();
  const fromMiddleware = h.get("x-locale");
  if (isLocale(fromMiddleware)) return fromMiddleware;
  return detectLocale((await cookies()).get(LOCALE_COOKIE)?.value, h.get("accept-language"));
}

/** Язык из тела или параметра запроса, если он корректен; иначе — язык текущего запроса */
export async function resolveLocale(value: string | null | undefined): Promise<Locale> {
  return isLocale(value) ? value : getRequestLocale();
}
