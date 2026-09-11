import { BUSINESS } from "@/lib/business";
import { formatDateRu, minToHHMM, nowMinutes, todayISO } from "@/lib/time";
import { runAssistant } from "./router";
import { analystTools, consultantTools } from "./tools";
import type { ChatMessage, ToolCtx } from "./types";

function now() {
  const t = todayISO();
  return `Сегодня ${formatDateRu(t)} (${t}), сейчас ${minToHHMM(nowMinutes())}.`;
}

const consultantPrompt = (ctx: ToolCtx) => `Ты — ИИ-консультант тюнинг-ателье «${BUSINESS.name}» (${BUSINESS.city}). ${now()}
Стиль: уверенный, дружелюбный, как опытный мастер, влюблённый в машины. Отвечай кратко (2–6 предложений), по-русски, без markdown-таблиц и заголовков; допускаются короткие списки и умеренные эмодзи.

Правила:
- Цены, длительность, мастеров и свободное время бери ТОЛЬКО из инструментов. Ничего не выдумывай. Цены в тенге (₸).
- Помогай выбрать услугу под задачу клиента, объясняй простым языком, что даст тюнинг.
- Запись: 1) определи услугу; 2) предложи ближайшие дни (get_available_days) и время (get_available_slots), спроси про мастера — или «любой»; 3) собери имя, телефон, авто; 4) повтори итог одной строкой и спроси подтверждение; 5) только после явного «да» вызови create_booking и сообщи результат.
- Если время занято или инструмент вернул ошибку — предложи ближайшие альтернативы.
- Вопросы не про авто и ателье вежливо возвращай к теме.
${ctx.channel === "bot" ? "- Клиент пишет в Telegram — подтверждение придёт ему сообщением." : `- Клиент на сайте. Также можно записаться самостоятельно в разделе «Запись» или в Telegram-боте @${BUSINESS.telegramBot}.`}`;

const analystPrompt = () => `Ты — бизнес-аналитик тюнинг-ателье «${BUSINESS.name}», отвечаешь владельцу. ${now()}
Используй инструменты для точных цифр, считай периоды сам (неделя = 7 дней). Отвечай структурно и кратко: ключевые цифры, выводы, 1–3 конкретные рекомендации (например, кого из мастеров догрузить, какие дни проседают, что продвигать). Можно использовать markdown-списки и **жирный**. Деньги — в тенге (₸).`;

/** Чистим историю: максимум 20 сообщений, начинается с user, роли чередуются */
function sanitize(messages: ChatMessage[]): ChatMessage[] {
  const out: ChatMessage[] = [];
  for (const m of messages.slice(-20)) {
    if (m.role !== "user" && m.role !== "assistant") continue;
    const content = String(m.content ?? "").slice(0, 2000).trim();
    if (!content) continue;
    if (out.length && out.at(-1)!.role === m.role) out.at(-1)!.content += `\n${content}`;
    else out.push({ role: m.role, content });
  }
  while (out.length && out[0].role !== "user") out.shift();
  return out;
}

export function askConsultant(messages: ChatMessage[], ctx: ToolCtx) {
  return runAssistant({ system: consultantPrompt(ctx), messages: sanitize(messages), tools: consultantTools, ctx });
}

export function askAnalyst(messages: ChatMessage[]) {
  return runAssistant({ system: analystPrompt(), messages: sanitize(messages), tools: analystTools, ctx: { channel: "admin" }, maxSteps: 8 });
}
