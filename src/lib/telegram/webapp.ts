import crypto from "node:crypto";
import type { Locale } from "@/i18n/config";

// Mini App — страница /[locale]/app на самом сайте; MINIAPP_URL нужен, только если адрес другой (туннель при локальной разработке)
const miniAppSite = process.env.MINIAPP_URL || process.env.PUBLIC_SITE_URL;
/** https-адрес для кнопок Mini App (http Telegram не принимает) или null — тогда кнопки скрыты */
export const MINIAPP_BASE = miniAppSite?.startsWith("https://") ? miniAppSite.replace(/\/$/, "") : null;
export const miniAppUrl = (locale: Locale, tab?: "my") =>
  MINIAPP_BASE ? `${MINIAPP_BASE}/${locale}/app${tab ? `?tab=${tab}` : ""}` : null;

/** Пользователь Mini App по подписанному initData из заголовка запроса */
export const tgUserFromRequest = (req: Request) => verifyInitData(req.headers.get("x-telegram-init-data"));

/** Проверка подписи Telegram Mini App initData. Возвращает id пользователя или null. */
export function verifyInitData(initData: string | null | undefined): string | null {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !initData) return null;
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return null;
  params.delete("hash");
  const dataCheck = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");
  const key = crypto.createHmac("sha256", "WebAppData").update(token).digest();
  const calc = crypto.createHmac("sha256", key).update(dataCheck).digest("hex");
  if (calc.length !== hash.length || !crypto.timingSafeEqual(Buffer.from(calc), Buffer.from(hash))) return null;
  const authDate = Number(params.get("auth_date"));
  if (!authDate || Date.now() / 1000 - authDate > 86_400) return null;
  try {
    return String(JSON.parse(params.get("user") ?? "{}").id ?? "") || null;
  } catch {
    return null;
  }
}
