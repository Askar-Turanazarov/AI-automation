import { prisma } from "@/lib/db";
import { anthropic } from "./providers/anthropic";
import { gemini } from "./providers/gemini";
import { openai } from "./providers/openai";
import { EmptyResponseError, type ChatMessage, type ProviderAdapter, type ProviderId, type ToolCtx, type ToolDef } from "./types";

const ADAPTERS: Record<ProviderId, ProviderAdapter> = { gemini, openai, anthropic };

const DEFAULT_CHAIN = "gemini:gemini-flash-latest,gemini:gemini-flash-lite-latest,openai:gpt-5-mini,anthropic:claude-haiku-4-5";

type Candidate = { provider: ProviderId; model: string; key: string };
type Health = { failures: number; cooldownUntil: number; disabled: boolean; lastError?: string; lastOkAt?: number };

// Состояние живёт в процессе (отдельно у сайта и у бота); история вызовов — в таблице AiLog
const g = globalThis as unknown as { __aiHealth?: Map<string, Health> };
const health = (g.__aiHealth ??= new Map());

function getChain(): Candidate[] {
  return (process.env.AI_CHAIN || DEFAULT_CHAIN)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const i = s.indexOf(":");
      const provider = s.slice(0, i) as ProviderId;
      return { provider, model: s.slice(i + 1), key: s };
    })
    .filter((c) => c.provider in ADAPTERS && c.model);
}

const h = (key: string): Health => {
  if (!health.has(key)) health.set(key, { failures: 0, cooldownUntil: 0, disabled: false });
  return health.get(key)!;
};

type ErrKind = "retryable" | "auth" | "model";

function classify(err: unknown): { kind: ErrKind; status?: number; message: string } {
  const e = err as { status?: number; name?: string; message?: string };
  const status = typeof e?.status === "number" ? e.status : undefined;
  const message = (e?.message || String(err)).slice(0, 300);
  if (status === 401 || status === 403) return { kind: "auth", status, message };
  if (status === 400 || status === 404 || status === 422) return { kind: "model", status, message };
  // 408/409/429/5xx/529, таймауты, сеть, пустой ответ
  return { kind: "retryable", status, message };
}

function markFailure(c: Candidate, kind: ErrKind, message: string) {
  const s = h(c.key);
  s.failures++;
  s.lastError = message;
  if (kind === "auth") {
    // ключ провайдера невалиден — отключаем все его модели
    for (const other of getChain().filter((x) => x.provider === c.provider)) h(other.key).disabled = true;
  } else if (kind === "model") {
    s.cooldownUntil = Date.now() + 10 * 60_000;
  } else {
    s.cooldownUntil = Date.now() + Math.min(15_000 * 2 ** (s.failures - 1), 10 * 60_000);
  }
}

function markOk(c: Candidate) {
  health.set(c.key, { failures: 0, cooldownUntil: 0, disabled: false, lastOkAt: Date.now() });
}

function log(c: Candidate, ok: boolean, latencyMs: number, channel: string, error = "") {
  prisma.aiLog
    .create({ data: { provider: c.provider, model: c.model, ok, latencyMs, channel, error: error.slice(0, 300) } })
    .catch(() => {});
}

export class AllModelsFailedError extends Error {}

export async function runAssistant(p: {
  system: string;
  messages: ChatMessage[];
  tools: ToolDef[];
  ctx: ToolCtx;
  maxSteps?: number;
}) {
  const timeoutMs = Number(process.env.AI_TIMEOUT_MS) || 25_000;
  const now = Date.now();
  const configured = getChain().filter((c) => ADAPTERS[c.provider].available() && !h(c.key).disabled);
  if (!configured.length) throw new AllModelsFailedError("Нет доступных ИИ-провайдеров: добавьте API-ключ в .env");

  // сначала здоровые модели по приоритету, затем «остывающие» — по времени окончания cooldown
  const healthy = configured.filter((c) => h(c.key).cooldownUntil <= now);
  const cooling = configured.filter((c) => h(c.key).cooldownUntil > now).sort((a, b) => h(a.key).cooldownUntil - h(b.key).cooldownUntil);
  const order = [...healthy, ...cooling];

  const executed: { name: string; args: unknown; result: unknown }[] = [];
  const execTool = async (name: string, args: Record<string, unknown>) => {
    const tool = p.tools.find((t) => t.name === name);
    let result: unknown;
    try {
      result = tool ? await tool.run(args, p.ctx) : { error: `Unknown tool ${name}` };
    } catch (e) {
      result = { error: e instanceof Error ? e.message : String(e) };
    }
    executed.push({ name, args, result });
    return result;
  };

  const errors: string[] = [];
  for (const c of order) {
    // провайдер мог быть отключён (401/403) на предыдущей итерации — не тратим вызов на тот же ключ
    if (h(c.key).disabled) continue;
    // если предыдущая модель упала посреди работы — передаём следующей уже выполненные действия
    const system = executed.length
      ? `${p.system}\n\nВ этом ходе уже выполнены действия (не повторяй их, используй результаты):\n${JSON.stringify(executed)}`
      : p.system;
    const started = Date.now();
    try {
      const text = await ADAPTERS[c.provider].run({
        model: c.model,
        system,
        messages: p.messages,
        tools: p.tools,
        execTool,
        timeoutMs,
        maxSteps: p.maxSteps ?? 6,
      });
      markOk(c);
      log(c, true, Date.now() - started, p.ctx.channel);
      return { text, provider: c.provider, model: c.model, executed, fallbacks: errors.length };
    } catch (err) {
      const { kind, status, message } = err instanceof EmptyResponseError ? { kind: "retryable" as const, status: undefined, message: err.message } : classify(err);
      markFailure(c, kind, message);
      log(c, false, Date.now() - started, p.ctx.channel, `${status ?? kind}: ${message}`);
      errors.push(`${c.key} → ${status ?? kind}`);
      console.warn(`[ai] ${c.key} failed (${status ?? kind}): ${message}. Switching…`);
    }
  }
  throw new AllModelsFailedError(`Все модели недоступны: ${errors.join("; ")}`);
}

export function getAiStatus() {
  const now = Date.now();
  return getChain().map((c, i) => {
    const s = h(c.key);
    const hasKey = ADAPTERS[c.provider].available();
    return {
      priority: i + 1,
      ...c,
      hasKey,
      state: !hasKey ? "no_key" : s.disabled ? "disabled" : s.cooldownUntil > now ? "cooldown" : "ready",
      cooldownSec: Math.max(0, Math.round((s.cooldownUntil - now) / 1000)),
      failures: s.failures,
      lastError: s.lastError ?? null,
      lastOkAt: s.lastOkAt ?? null,
    };
  });
}
