import type { Locale } from "@/i18n/config";

export type ProviderId = "gemini" | "openai" | "anthropic";

export type ChatMessage = { role: "user" | "assistant"; content: string };

export type ToolCtx = { channel: "web" | "bot" | "admin"; locale: Locale; tgUserId?: string | null };

export type JsonSchema = { type: "object"; properties: Record<string, unknown>; required?: string[] };

export type ToolDef = {
  name: string;
  description: string;
  parameters: JsonSchema;
  run: (args: Record<string, unknown>, ctx: ToolCtx) => Promise<unknown>;
};

export type ExecTool = (name: string, args: Record<string, unknown>) => Promise<unknown>;

export type RunOptions = {
  model: string;
  system: string;
  messages: ChatMessage[];
  tools: Pick<ToolDef, "name" | "description" | "parameters">[];
  execTool: ExecTool;
  timeoutMs: number;
  maxSteps: number;
};

export interface ProviderAdapter {
  id: ProviderId;
  available(): boolean;
  /** Полный tool-loop на нативном API провайдера; возвращает финальный текст */
  run(opts: RunOptions): Promise<string>;
}

export class EmptyResponseError extends Error {
  constructor() {
    super("Empty model response");
  }
}
