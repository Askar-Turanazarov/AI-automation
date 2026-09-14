import { z } from "zod";
import { getDict, tpl } from "@/i18n";
import type { Locale } from "@/i18n/config";
import { BUSINESS } from "@/lib/business";
import { prisma } from "@/lib/db";
import { localizeService } from "@/lib/i18n-data";
import { LANGUAGE } from "./assistant";
import { AllModelsFailedError, runAssistant } from "./router";

export const QUIZ_GOALS = ["power", "sound", "handling", "protection", "comfort"] as const;
export const QUIZ_BUDGETS = ["low", "mid", "high"] as const;
export type QuizGoal = (typeof QUIZ_GOALS)[number];
export type QuizBudget = (typeof QUIZ_BUDGETS)[number];

export const quizInput = z.object({
  car: z.string().trim().max(80).default(""),
  goals: z.array(z.enum(QUIZ_GOALS)).min(1).max(QUIZ_GOALS.length),
  budget: z.enum(QUIZ_BUDGETS),
});

const BUDGET_MAX: Record<QuizBudget, number> = { low: 3_000_000, mid: 10_000_000, high: Number.POSITIVE_INFINITY };
const BUDGET_TEXT: Record<QuizBudget, string> = {
  low: "up to 3,000,000 UZS in total",
  mid: "up to 10,000,000 UZS in total",
  high: "no strict limit",
};
// подбор без ИИ: цель → категория каталога (названия категорий из сида — на русском)
const GOAL_CATEGORY: Record<QuizGoal, string> = {
  power: "Двигатель",
  sound: "Выхлоп",
  handling: "Подвеска",
  protection: "Кузов",
  comfort: "Салон",
};

type CatalogService = { id: string; name: string; category: string; price: number; durationMin: number };
type Pick = { serviceId: string; why: string };

/** Без ИИ: по порядку целей — лучшая (самая полная) услуга категории, которая помещается в остаток бюджета на весь пакет */
export function pickByRules(services: CatalogService[], goals: QuizGoal[], budget: QuizBudget) {
  const picked = new Map<string, QuizGoal>();
  let left = BUDGET_MAX[budget];
  for (const goal of goals) {
    const best = services
      .filter((s) => s.category === GOAL_CATEGORY[goal] && s.price <= left && !picked.has(s.id))
      .sort((a, b) => a.price - b.price)
      .at(-1);
    if (!best) continue;
    picked.set(best.id, goal);
    left -= best.price;
  }
  return [...picked].map(([serviceId, goal]) => ({ serviceId, goal }));
}

const aiAnswer = z.object({
  summary: z.string().trim().min(1).max(800),
  items: z.array(z.object({ serviceId: z.string(), why: z.string().trim().max(300) })).max(6),
});

/** Ответ модели → JSON (в том числе внутри markdown-блока); услуги не из каталога и повторы отбрасываются */
export function parseAiAnswer(text: string, catalogIds: Set<string>): { summary: string; items: Pick[] } | null {
  const json = text.match(/\{[\s\S]*\}/)?.[0];
  if (!json) return null;
  try {
    const parsed = aiAnswer.safeParse(JSON.parse(json));
    if (!parsed.success) return null;
    const items: Pick[] = [];
    for (const i of parsed.data.items) {
      if (catalogIds.has(i.serviceId) && !items.some((x) => x.serviceId === i.serviceId)) items.push(i);
    }
    return items.length ? { summary: parsed.data.summary, items } : null;
  } catch {
    return null;
  }
}

const systemPrompt = (locale: Locale, services: CatalogService[]) =>
  `You are a senior tuning consultant at "${BUSINESS.name}", a car tuning atelier in Tashkent.
Recommend a package ONLY from the catalog below for the client's car, goals and budget. Never invent services or prices.
Pick 1–4 services ordered by importance, keep the total within the budget and skip services that make no sense for that car.
Write in ${LANGUAGE[locale]}${locale === "uz" ? " (Latin alphabet only)" : ""}: friendly, concrete, no markdown.
Answer with JSON only: {"summary": "2–3 sentences to the client about the package", "items": [{"serviceId": "id from the catalog", "why": "one short sentence on what it gives this car"}]}

Catalog (id | name | category | price UZS | duration min):
${services.map((s) => `${s.id} | ${s.name} | ${s.category} | ${s.price} | ${s.durationMin}`).join("\n")}`;

/** AI-подбор тюнинга для лендинга; если ИИ недоступен или ответил не по формату — подбор по правилам */
export async function recommendTuning(input: z.output<typeof quizInput>, locale: Locale) {
  const raw = await prisma.service.findMany({
    where: { active: true, masters: { some: { master: { active: true } } } },
    orderBy: { price: "asc" },
  });
  const services = raw.map((s) => localizeService(s, locale));
  const q = getDict(locale).quiz;

  let picks: { summary: string; items: Pick[] } | null = null;
  try {
    const r = await runAssistant({
      system: systemPrompt(locale, services),
      messages: [
        {
          role: "user",
          content: `Car: ${input.car || "not specified"}. Goals: ${input.goals.join(", ")}. Budget: ${BUDGET_TEXT[input.budget]}.`,
        },
      ],
      tools: [],
      ctx: { channel: "web", locale },
      maxSteps: 1,
    });
    picks = parseAiAnswer(r.text, new Set(services.map((s) => s.id)));
  } catch (e) {
    if (!(e instanceof AllModelsFailedError)) throw e;
  }
  const ai = !!picks;
  // категории сравниваем по исходным русским названиям
  picks ??= {
    summary: tpl(q.fallbackSummary, { car: input.car || q.yourCar }),
    items: pickByRules(raw, input.goals, input.budget).map(({ serviceId, goal }) => ({ serviceId, why: q.goals[goal].why })),
  };

  const byId = new Map(services.map((s) => [s.id, s]));
  const items = picks.items.map(({ serviceId, why }) => {
    const s = byId.get(serviceId)!;
    return { id: s.id, name: s.name, category: s.category, price: s.price, durationMin: s.durationMin, why };
  });
  return { summary: picks.summary, items, total: items.reduce((sum, s) => sum + s.price, 0), ai };
}

export type QuizResult = Awaited<ReturnType<typeof recommendTuning>>;
