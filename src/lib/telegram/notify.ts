// Лёгкая отправка сообщений через Bot API без grammY (используется и сайтом, и ботом).

export async function sendTelegram(chatId: string | number | null | undefined, html: string, replyMarkup?: object) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !chatId) return;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: html, parse_mode: "HTML", disable_web_page_preview: true, reply_markup: replyMarkup }),
    });
    // в лог только статус и описание от Telegram — URL с токеном не пишем
    if (!res.ok) console.error("[telegram] send failed", res.status, (await res.text().catch(() => "")).slice(0, 200));
  } catch (e) {
    console.error("[telegram] send failed", e);
  }
}

/** Фото через Bot API; возвращает file_id самого крупного размера — по нему фото потом показывается без своего хранилища */
export async function sendTelegramPhoto(chatId: string | number | null | undefined, photo: Blob, caption: string, replyMarkup?: object) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !chatId) return null;
  const form = new FormData();
  form.set("chat_id", String(chatId));
  form.set("photo", photo, "photo.jpg");
  form.set("caption", caption);
  form.set("parse_mode", "HTML");
  if (replyMarkup) form.set("reply_markup", JSON.stringify(replyMarkup));
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, { method: "POST", body: form });
    const data = (await res.json().catch(() => null)) as {
      ok?: boolean;
      description?: string;
      result?: { photo?: { file_id: string }[] };
    } | null;
    if (data?.ok) return data.result?.photo?.at(-1)?.file_id ?? null;
    console.error("[telegram] photo send failed", res.status, data?.description?.slice(0, 200));
  } catch (e) {
    console.error("[telegram] photo send failed", e);
  }
  return null;
}

/** Файл по file_id (ответ со стримом) — токен остаётся на сервере */
export async function fetchTelegramFile(fileId: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return null;
  try {
    const meta = (await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${encodeURIComponent(fileId)}`).then((r) =>
      r.json(),
    )) as {
      ok?: boolean;
      result?: { file_path?: string };
    };
    if (!meta.ok || !meta.result?.file_path) return null;
    const file = await fetch(`https://api.telegram.org/file/bot${token}/${meta.result.file_path}`);
    return file.ok ? file : null;
  } catch {
    return null;
  }
}

export const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
