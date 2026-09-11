import crypto from "node:crypto";

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
