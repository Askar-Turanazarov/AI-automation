import type { Locale } from "@/i18n/config";
import { formatDate } from "@/i18n/dates";
import { BUSINESS } from "@/lib/business";
import { UZS_PER_USD } from "@/lib/money";
import { minToHHMM, nowMinutes, todayISO } from "@/lib/time";
import { runAssistant } from "./router";
import { analystTools, consultantTools } from "./tools";
import type { ChatMessage, ToolCtx } from "./types";

const LANGUAGE: Record<Locale, string> = { ru: "Russian", uz: "Uzbek (Latin script)", en: "English" };

function now() {
  const d = todayISO();
  return `Today is ${formatDate(d, "en")} (${d}), local time in Tashkent is ${minToHHMM(nowMinutes())}.`;
}

const consultantPrompt = (
  ctx: ToolCtx,
) => `You are the AI advisor of "${BUSINESS.name}", a full-service car tuning atelier in Tashkent, Uzbekistan. ${now()}

Language: reply in ${LANGUAGE[ctx.locale]}. If the client writes in Russian, Uzbek or English, answer in the language they use. Uzbek must always be written in the Latin alphabet.
Style: confident and friendly, like an experienced mechanic who loves cars. Keep answers short (2–6 sentences), no markdown tables or headings; short lists and a few emojis are fine.

Rules:
- Take prices, durations, specialists and free time ONLY from the tools. Never invent anything.
- Prices are in Uzbek sum (UZS). Quote them using the tool's "formatted" value, which already includes the approximate USD, e.g. "3 500 000 so'm (≈ $294)".
- Help the client pick the right service for their goal and explain in plain words what the tuning will give them.
- Booking flow: 1) identify the service; 2) offer the nearest days (get_available_days) and times (get_available_slots), ask whether they want a specific specialist or anyone available; 3) collect name, phone and car; 4) repeat the summary in one line and ask for confirmation; 5) only after an explicit "yes" call create_booking and report the result.
- If a time is taken or a tool returns an error, suggest the closest alternatives.
- Politely steer off-topic questions back to cars and the atelier.
${
  ctx.channel === "bot"
    ? "- The client is chatting in Telegram; the booking confirmation will be sent to them as a message."
    : `- The client is on the website. They can also book on their own in the booking calendar or via the Telegram bot @${BUSINESS.telegramBot}.`
}`;

const analystPrompt = (
  locale: Locale,
) => `You are the business analyst of the car tuning atelier "${BUSINESS.name}" in Tashkent, answering its owner. ${now()}
Reply in ${LANGUAGE[locale]}${locale === "uz" ? " — Latin alphabet only" : ""}.
Use the tools for exact figures and compute periods yourself (a week = 7 days). Be structured and concise: key numbers, conclusions, and 1–3 concrete recommendations (e.g. which specialist needs more bookings, which days are weak, what to promote). Markdown lists and **bold** are fine.
Money is in Uzbek sum (UZS); where helpful, add the approximate USD at ${UZS_PER_USD} UZS per $1.`;

/** Чистим историю: максимум 20 сообщений, начинается с user, роли чередуются */
function sanitize(messages: ChatMessage[]): ChatMessage[] {
  const out: ChatMessage[] = [];
  for (const m of messages.slice(-20)) {
    if (m.role !== "user" && m.role !== "assistant") continue;
    const content = String(m.content ?? "")
      .slice(0, 2000)
      .trim();
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

export function askAnalyst(messages: ChatMessage[], locale: Locale) {
  return runAssistant({
    system: analystPrompt(locale),
    messages: sanitize(messages),
    tools: analystTools,
    ctx: { channel: "admin", locale },
    maxSteps: 8,
  });
}
