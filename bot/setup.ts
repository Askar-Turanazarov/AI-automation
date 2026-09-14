import { Bot } from "grammy";
import { configureBot } from "./create";

// Подключение прод-бота к сайту на Vercel: npm run bot:setup (переменные из .env.production.local — vercel env pull)
async function main() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const site = process.env.PUBLIC_SITE_URL?.replace(/\/$/, "");
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!token || !site?.startsWith("https://") || !secret) {
    throw new Error("Нужны TELEGRAM_BOT_TOKEN, PUBLIC_SITE_URL (https://…) и TELEGRAM_WEBHOOK_SECRET");
  }
  const bot = new Bot(token);
  await configureBot(bot);
  await bot.api.setWebhook(`${site}/api/telegram`, { secret_token: secret, drop_pending_updates: true });
  const info = await bot.api.getWebhookInfo();
  console.log(
    `✅ Webhook: ${info.url}, ожидают обработки: ${info.pending_update_count}${info.last_error_message ? `, ошибка: ${info.last_error_message}` : ""}`,
  );
}

main().catch((e) => {
  console.error("Не удалось настроить бота:", e instanceof Error ? e.message : e);
  process.exit(1);
});
