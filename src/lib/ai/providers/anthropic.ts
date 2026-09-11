import Anthropic from "@anthropic-ai/sdk";
import { EmptyResponseError, type ProviderAdapter } from "../types";

let client: Anthropic | null = null;

export const anthropic: ProviderAdapter = {
  id: "anthropic",
  available: () => !!process.env.ANTHROPIC_API_KEY,
  async run({ model, system, messages, tools, execTool, timeoutMs, maxSteps }) {
    client ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, maxRetries: 0 });
    const msgs: Anthropic.MessageParam[] = messages.map((m) => ({ role: m.role, content: m.content }));
    const toolDefs: Anthropic.Tool[] = tools.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.parameters as Anthropic.Tool.InputSchema,
    }));

    for (let step = 0; step < maxSteps; step++) {
      const res = await client.messages.create(
        { model, max_tokens: 4096, system, tools: toolDefs, messages: msgs },
        { timeout: timeoutMs },
      );
      if (res.stop_reason === "refusal") throw new Error("Anthropic: refusal");
      const toolUses = res.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
      if (!toolUses.length) {
        const text = res.content
          .filter((b): b is Anthropic.TextBlock => b.type === "text")
          .map((b) => b.text)
          .join("\n")
          .trim();
        if (!text) throw new EmptyResponseError();
        return text;
      }
      msgs.push({ role: "assistant", content: res.content });
      const results: Anthropic.ToolResultBlockParam[] = [];
      for (const t of toolUses) {
        const result = await execTool(t.name, (t.input ?? {}) as Record<string, unknown>);
        results.push({ type: "tool_result", tool_use_id: t.id, content: JSON.stringify(result) });
      }
      msgs.push({ role: "user", content: results });
    }
    throw new Error("Anthropic: too many tool steps");
  },
};
