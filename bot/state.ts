import type { Context } from "grammy";
import type { ChatMessage } from "../src/lib/ai/types";

export type Draft = {
  serviceId?: string;
  masterId?: string | null;
  date?: string;
  time?: number;
  name?: string;
  phone?: string;
  car?: string;
  await?: "name" | "phone" | "car";
};
export type State = { draft: Draft; ai: ChatMessage[]; aiBusy?: boolean };

/** Состояние диалога по chat_id (в памяти, сбрасывается при рестарте) */
export const states = new Map<number, State>();
export const st = (ctx: Context) => {
  const id = ctx.chat!.id;
  if (!states.has(id)) states.set(id, { draft: {}, ai: [] });
  return states.get(id)!;
};
