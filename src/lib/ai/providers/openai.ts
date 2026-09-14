import OpenAI from "openai";
import type { ChatCompletionMessageParam, ChatCompletionTool } from "openai/resources/chat/completions";
import { EmptyResponseError, type ProviderAdapter } from "../types";

let client: OpenAI | null = null;

// GPT-5.x/6 с function tools в Chat Completions работают только с reasoning "none" (и так быстрее); у gpt-5 / gpt-5-mini минимум — "minimal"
const reasoningEffort = (model: string) => (/^gpt-(5\.\d|6)/.test(model) ? "none" : /^gpt-5/.test(model) ? "minimal" : undefined);

export const openai: ProviderAdapter = {
  id: "openai",
  available: () => !!process.env.OPENAI_API_KEY,
  async run({ model, system, messages, tools, execTool, timeoutMs, maxSteps }) {
    client ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY, maxRetries: 0 });
    const msgs: ChatCompletionMessageParam[] = [{ role: "system", content: system }, ...messages];
    const fnTools: ChatCompletionTool[] = tools.map((t) => ({
      type: "function",
      function: { name: t.name, description: t.description, parameters: t.parameters },
    }));

    for (let step = 0; step < maxSteps; step++) {
      const res = await client.chat.completions.create(
        { model, messages: msgs, tools: fnTools.length ? fnTools : undefined, reasoning_effort: reasoningEffort(model) },
        { timeout: timeoutMs },
      );
      const msg = res.choices[0]?.message;
      const calls = (msg?.tool_calls ?? []).filter((c) => c.type === "function");
      if (!calls.length) {
        const text = msg?.content?.trim();
        if (!text) throw new EmptyResponseError();
        return text;
      }
      msgs.push({ role: "assistant", content: msg!.content ?? null, tool_calls: calls });
      for (const c of calls) {
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(c.function.arguments || "{}");
        } catch {}
        const result = await execTool(c.function.name, args);
        msgs.push({ role: "tool", tool_call_id: c.id, content: JSON.stringify(result) });
      }
    }
    throw new Error("OpenAI: too many tool steps");
  },
};
