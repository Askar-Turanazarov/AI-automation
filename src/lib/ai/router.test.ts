import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RunOptions } from "./types";

const runs = vi.hoisted(() => ({ gemini: vi.fn(), openai: vi.fn(), anthropic: vi.fn() }));

vi.mock("@/lib/db", () => ({ prisma: { aiLog: { create: () => Promise.resolve() } } }));
vi.mock("./providers/gemini", () => ({ gemini: { id: "gemini", available: () => true, run: (o: RunOptions) => runs.gemini(o) } }));
vi.mock("./providers/openai", () => ({ openai: { id: "openai", available: () => true, run: (o: RunOptions) => runs.openai(o) } }));
vi.mock("./providers/anthropic", () => ({
  anthropic: { id: "anthropic", available: () => true, run: (o: RunOptions) => runs.anthropic(o) },
}));

import { AllModelsFailedError, getAiStatus, runAssistant } from "./router";

const httpError = (status: number) => Object.assign(new Error(`HTTP ${status}`), { status });
const call = (tools: Parameters<typeof runAssistant>[0]["tools"] = []) =>
  runAssistant({ system: "sys", messages: [{ role: "user", content: "hi" }], tools, ctx: { channel: "web", locale: "ru" } });

beforeEach(() => {
  (globalThis as unknown as { __aiHealth: Map<string, unknown> }).__aiHealth.clear();
  Object.values(runs).forEach((r) => r.mockReset());
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("AI router failover", () => {
  it("skips overloaded / rate-limited models and answers from the next one", async () => {
    process.env.AI_CHAIN = "gemini:m1,gemini:m2,openai:m3";
    runs.gemini.mockRejectedValueOnce(httpError(503)).mockRejectedValueOnce(httpError(429));
    runs.openai.mockResolvedValue("ok");

    const r = await call();
    expect(r).toMatchObject({ text: "ok", provider: "openai", model: "m3", fallbacks: 2 });
    expect(getAiStatus().map((s) => s.state)).toEqual(["cooldown", "cooldown", "ready"]);

    // следующий запрос сразу идёт в здоровую модель, не трогая «остывающие»
    await call();
    expect(runs.gemini).toHaveBeenCalledTimes(2);
    expect(runs.openai).toHaveBeenCalledTimes(2);
  });

  it("disables every model of a provider with an invalid key", async () => {
    process.env.AI_CHAIN = "gemini:m1,gemini:m2,anthropic:m3";
    runs.gemini.mockRejectedValue(httpError(401));
    runs.anthropic.mockResolvedValue("claude");

    const r = await call();
    expect(r.provider).toBe("anthropic");
    expect(runs.gemini).toHaveBeenCalledTimes(1);
    expect(
      getAiStatus()
        .slice(0, 2)
        .map((s) => s.state),
    ).toEqual(["disabled", "disabled"]);
  });

  it("treats timeouts / network errors as retryable", async () => {
    process.env.AI_CHAIN = "gemini:m1,openai:m2";
    runs.gemini.mockRejectedValue(new Error("Request timed out"));
    runs.openai.mockResolvedValue("ok");
    expect((await call()).provider).toBe("openai");
    expect(getAiStatus()[0].state).toBe("cooldown");
  });

  it("passes already executed tool calls to the fallback model (no duplicate booking)", async () => {
    process.env.AI_CHAIN = "gemini:m1,openai:m2";
    const book = vi.fn(async () => ({ ok: true, bookingId: "b1" }));
    runs.gemini.mockImplementation(async (o: RunOptions) => {
      await o.execTool("create_booking", { date: "2026-09-14" });
      throw httpError(500);
    });
    runs.openai.mockImplementation(async (o: RunOptions) => o.system);

    const r = await call([{ name: "create_booking", description: "", parameters: { type: "object", properties: {} }, run: book }]);
    expect(book).toHaveBeenCalledTimes(1);
    expect(r.text).toContain("уже выполнены");
    expect(r.text).toContain("b1");
  });

  it("throws when every model fails", async () => {
    process.env.AI_CHAIN = "gemini:m1,openai:m2";
    runs.gemini.mockRejectedValue(httpError(503));
    runs.openai.mockRejectedValue(httpError(529));
    await expect(call()).rejects.toBeInstanceOf(AllModelsFailedError);
  });
});
