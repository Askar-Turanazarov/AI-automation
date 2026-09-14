import "dotenv/config";
import { GrammyError } from "grammy";
import { configureBot, createBot } from "./create";
import { MINIAPP_BASE } from "./ui";

// Локальный запуск через long polling. На Vercel бот работает по webhook: src/app/api/telegram/route.ts
const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error("TELEGRAM_BOT_TOKEN не задан в .env");
  process.exit(1);
}

const bot = createBot(token);

async function main() {
  await configureBot(bot);
  const me = await bot.api.getMe();
  console.log(`🤖 @${me.username} запущен (long polling)${MINIAPP_BASE ? `, Mini App: ${MINIAPP_BASE}/{ru|uz|en}/book` : ""}`);
  // bot.start снимает webhook: после локального запуска снова выполните npm run bot:setup для прода
  await bot.start({ drop_pending_updates: true });
}

main().catch((e) => {
  console.error("Не удалось запустить бота:", e instanceof GrammyError ? e.description : e instanceof Error ? e.message : e);
  process.exit(1);
});
process.once("SIGINT", () => bot.stop());
process.once("SIGTERM", () => bot.stop());
