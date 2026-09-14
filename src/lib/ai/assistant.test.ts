import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ChatMessage, ToolCtx } from "./types";

// BUSINESS_TZ читается при импорте time.ts — фиксируем до импортов
vi.hoisted(() => vi.stubEnv("BUSINESS_TZ", "Asia/Tashkent"));

const runAssistant = vi.hoisted(() => vi.fn());
vi.mock("./router", () => ({ runAssistant }));
vi.mock("./tools", () => ({ consultantTools: [{ name: "consultant_tool" }], analystTools: [{ name: "analyst_tool" }] }));

import { UZS_PER_USD } from "@/lib/money";
import { askAnalyst, askConsultant } from "./assistant";
import { analystTools, consultantTools } from "./tools";

type RunArgs = { system: string; messages: ChatMessage[]; tools: unknown; ctx: ToolCtx; maxSteps?: number };
const lastCall = () => runAssistant.mock.calls.at(-1)![0] as RunArgs;
const sent = (messages: ChatMessage[]) => {
  askConsultant(messages, { channel: "web", locale: "ru" });
  return lastCall().messages;
};

const u = (content: string): ChatMessage => ({ role: "user", content });
const a = (content: string): ChatMessage => ({ role: "assistant", content });

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-14T05:05:00Z")); // 10:05 в Ташкенте
  runAssistant.mockResolvedValue({ text: "ok" });
});

afterEach(() => {
  vi.useRealTimers();
  runAssistant.mockReset();
});

afterAll(() => vi.unstubAllEnvs());

describe("history sanitization", () => {
  it("drops leading assistant messages, empty ones and unknown roles; trims", () => {
    const system = { role: "system", content: "ignore me" } as unknown as ChatMessage;
    const nullContent = { role: "user", content: null } as unknown as ChatMessage;
    expect(sent([a("hello!"), system, u("  hi  "), a("   "), nullContent, a("answer")])).toEqual([u("hi"), a("answer")]);
  });

  it("merges consecutive messages of the same role with a newline", () => {
    expect(sent([u("one"), u("two"), a("x"), a("y"), u("three")])).toEqual([u("one\ntwo"), a("x\ny"), u("three")]);
  });

  it("keeps only the last 20 messages before filtering", () => {
    const history = Array.from({ length: 25 }, (_, i) => (i % 2 ? a(`a${i}`) : u(`u${i}`)));
    const out = sent(history);
    // из последних 20 первое сообщение — assistant (a5), оно отбрасывается
    expect(out).toHaveLength(19);
    expect(out[0]).toEqual(u("u6"));
    expect(out.at(-1)).toEqual(u("u24"));
  });

  it("truncates each message to 2000 chars (merged messages may exceed it)", () => {
    const long = "x".repeat(2500);
    expect(sent([u(long)])[0].content).toHaveLength(2000);
    expect(sent([u(long), u(long)])[0].content).toHaveLength(4001);
  });

  it("passes an empty history when there are no user messages", () => {
    expect(sent([a("only assistant")])).toEqual([]);
    expect(runAssistant).toHaveBeenCalled();
  });

  it("does not mutate the input", () => {
    const history = [u("one"), u("two")];
    sent(history);
    expect(history).toEqual([u("one"), u("two")]);
  });
});

describe("askConsultant", () => {
  it("passes prompt, tools and ctx and returns the router result", async () => {
    const ctx: ToolCtx = { channel: "web", locale: "uz", tgUserId: null };
    await expect(askConsultant([u("salom")], ctx)).resolves.toEqual({ text: "ok" });
    const call = lastCall();
    expect(call.ctx).toBe(ctx);
    expect(call.tools).toBe(consultantTools);
    expect(call.maxSteps).toBeUndefined();
    expect(call.system).toContain('AI advisor of "Octane Forge"');
    expect(call.system).toContain("Today is Mon, Sep 14 (2026-09-14), local time in Tashkent is 10:05.");
    expect(call.system).toContain("reply in Uzbek (Latin script)");
    expect(call.system).toContain("@octane_forge_bot");
  });

  it("uses the Telegram hint for the bot channel", () => {
    askConsultant([u("hi")], { channel: "bot", locale: "en", tgUserId: "555" });
    const { system } = lastCall();
    expect(system).toContain("reply in English");
    expect(system).toContain("chatting in Telegram");
    expect(system).not.toContain("@octane_forge_bot");
  });
});

describe("askAnalyst", () => {
  it("uses analyst prompt, admin ctx and 8 steps", () => {
    askAnalyst([u("stats?")], "en");
    const call = lastCall();
    expect(call.ctx).toEqual({ channel: "admin", locale: "en" });
    expect(call.tools).toBe(analystTools);
    expect(call.maxSteps).toBe(8);
    expect(call.messages).toEqual([u("stats?")]);
    expect(call.system).toContain("business analyst");
    expect(call.system).toContain("Reply in English.");
    expect(call.system).toContain(`${UZS_PER_USD} UZS per $1`);
  });

  it("requires Latin script for uz", () => {
    askAnalyst([u("?")], "uz");
    expect(lastCall().system).toContain("Reply in Uzbek (Latin script) — Latin alphabet only.");
  });
});
