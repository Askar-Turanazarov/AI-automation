import type { Context, NextFunction } from "grammy";
import type { ChatMessage } from "../src/lib/ai/types";
import { prisma } from "../src/lib/db";

export type Draft = {
  serviceId?: string;
  masterId?: string | null;
  date?: string;
  time?: number;
  name?: string;
  phone?: string;
  car?: string;
  await?: "name" | "phone" | "car" | "review";
  reviewId?: string;
};
export type State = { draft: Draft; ai: ChatMessage[]; aiBusy?: boolean };

/** Состояние диалога по chat_id: в памяти на время обработки апдейта, между апдейтами — в БД (serverless не хранит память) */
export const states = new Map<number, State>();
export const st = (ctx: Context) => {
  const id = ctx.chat!.id;
  if (!states.has(id)) states.set(id, { draft: {}, ai: [] });
  return states.get(id)!;
};

/** Middleware: подгружает состояние чата из БД перед обработчиками и сохраняет после */
export async function persistState(ctx: Context, next: NextFunction) {
  const id = ctx.chat?.id;
  if (id === undefined) return next();
  const chatId = String(id);
  // пока в этом процессе идёт ответ ИИ, работаем с тем же объектом, чтобы не потерять его историю
  if (!states.get(id)?.aiBusy) {
    const row = await prisma.botSession.findUnique({ where: { chatId } });
    if (row) states.set(id, JSON.parse(row.data) as State);
  }
  await next();
  const s = states.get(id);
  if (!s) {
    await prisma.botSession.deleteMany({ where: { chatId } });
    return;
  }
  const data = JSON.stringify({ draft: s.draft, ai: s.ai });
  await prisma.botSession.upsert({ where: { chatId }, create: { chatId, data }, update: { data } });
}
