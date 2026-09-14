import "dotenv/config";
import { Bot, GrammyError, HttpError } from "grammy";
import { dictionaries } from "../src/i18n";
import { locales, type Locale } from "../src/i18n/config";
import { registerAi } from "./ai";
import { registerBooking } from "./booking";
import { registerMy } from "./my";
import { registerOwner } from "./owner";
import { registerStart } from "./start";
import { MINIAPP_BASE } from "./ui";

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error("TELEGRAM_BOT_TOKEN не задан в .env");
  process.exit(1);
}

const bot = new Bot(token);

// порядок важен: grammY проходит обработчики в порядке регистрации, свободный текст (шаги формы / ИИ) — последним
registerStart(bot);
registerBooking(bot);
registerMy(bot);
registerOwner(bot);
registerAi(bot);

bot.catch((err) => {
  const e = err.error;
  if (e instanceof GrammyError) console.error("Telegram error:", e.description);
  else if (e instanceof HttpError) console.error("Network error:", e);
  else console.error("Bot error:", e);
});

async function main() {
  const commands = (l: Locale) => {
    const b = dictionaries[l].bot;
    return [
      { command: "book", description: b.cmdBook },
      { command: "my", description: b.cmdMy },
      { command: "lang", description: b.cmdLang },
      { command: "help", description: b.cmdHelp },
    ];
  };
  await bot.api.setMyCommands(commands("ru"));
  for (const l of locales) await bot.api.setMyCommands(commands(l), { language_code: l });
  if (MINIAPP_BASE) {
    await bot.api.setChatMenuButton({
      menu_button: { type: "web_app", text: dictionaries.ru.bot.menuButton, web_app: { url: `${MINIAPP_BASE}/book` } },
    });
  }
  const me = await bot.api.getMe();
  console.log(`🤖 @${me.username} запущен (long polling)${MINIAPP_BASE ? `, Mini App: ${MINIAPP_BASE}/{ru|uz|en}/book` : ""}`);
  await bot.start({ drop_pending_updates: true });
}

main().catch((e) => {
  console.error("Не удалось запустить бота:", e instanceof GrammyError ? e.description : e instanceof Error ? e.message : e);
  process.exit(1);
});
process.once("SIGINT", () => bot.stop());
process.once("SIGTERM", () => bot.stop());
