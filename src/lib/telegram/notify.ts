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

export const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
