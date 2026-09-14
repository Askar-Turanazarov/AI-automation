import { Bot, GrammyError, HttpError } from "grammy";
import { dictionaries } from "../src/i18n";
import { locales, type Locale } from "../src/i18n/config";
import { registerAi } from "./ai";
import { registerBooking } from "./booking";
import { registerMy } from "./my";
import { registerOwner } from "./owner";
import { registerReviews } from "./reviews";
import { registerStart } from "./start";
import { persistState } from "./state";
import { MINIAPP_BASE } from "./ui";

/** Бот с обработчиками — общий для long polling (локально) и webhook (Vercel) */
export function createBot(token: string) {
  const bot = new Bot(token);
  bot.use(persistState);

  // порядок важен: grammY проходит обработчики в порядке регистрации, свободный текст (шаги формы / ИИ) — последним
  registerStart(bot);
  registerBooking(bot);
  registerMy(bot);
  registerOwner(bot);
  registerReviews(bot);
  registerAi(bot);

  bot.catch((err) => {
    const e = err.error;
    if (e instanceof GrammyError) console.error("Telegram error:", e.description);
    else if (e instanceof HttpError) console.error("Network error:", e);
    else console.error("Bot error:", e);
  });
  return bot;
}

/** Команды на трёх языках и кнопка меню с Mini App */
export async function configureBot(bot: Bot) {
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
      menu_button: { type: "web_app", text: dictionaries.ru.bot.menuButton, web_app: { url: `${MINIAPP_BASE}/app` } },
    });
  }
}
