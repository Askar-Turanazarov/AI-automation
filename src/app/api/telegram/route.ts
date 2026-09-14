import { timingSafeEqual } from "node:crypto";
import type { Update } from "grammy/types";
import { after } from "next/server";
import { createBot } from "../../../../bot/create";

export const runtime = "nodejs";

// один бот на инстанс функции: getMe выполняется только при холодном старте
let bot: ReturnType<typeof createBot> | null = null;

const sameSecret = (got: string | null, expected: string) => {
  if (!got) return false;
  const a = Buffer.from(got);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
};

/** Webhook Telegram: отвечаем сразу, апдейт обрабатываем после ответа — иначе Telegram повторит его, пока ИИ думает */
export async function POST(req: Request) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!token || !secret) return new Response("Bot is not configured", { status: 503 });
  if (!sameSecret(req.headers.get("x-telegram-bot-api-secret-token"), secret)) return new Response("Unauthorized", { status: 401 });

  let update: Update;
  try {
    update = await req.json();
  } catch {
    return new Response("Bad JSON", { status: 400 });
  }
  const b = (bot ??= createBot(token));
  // bot.catch работает только в long polling — здесь ошибки ловим сами
  after(() =>
    b
      .init()
      .then(() => b.handleUpdate(update))
      .catch((e) => console.error("[bot webhook]", e)),
  );
  return new Response("ok");
}
